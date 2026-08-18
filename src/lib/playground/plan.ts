/**
 * Parses `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` output into a tree the UI
 * can render, and derives the warnings a reviewer would actually call out:
 * scans that should be index lookups, planner mis-estimates, sorts that spill
 * to disk, and nested loops running far too many times.
 */

export type RawPlan = {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  "Join Type"?: string;
  "Plan Rows": number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Actual Total Time"?: number;
  "Total Cost": number;
  Filter?: string;
  "Index Cond"?: string;
  "Hash Cond"?: string;
  "Rows Removed by Filter"?: number;
  "Sort Method"?: string;
  "Sort Space Used"?: number;
  "Sort Space Type"?: string;
  "Shared Hit Blocks"?: number;
  "Shared Read Blocks"?: number;
  Plans?: RawPlan[];
};

export type ExplainResult = {
  Plan: RawPlan;
  "Planning Time"?: number;
  "Execution Time"?: number;
};

export type PlanNode = {
  id: number;
  label: string;
  detail: string | null;
  relation: string | null;
  /** Total time across every loop, in ms. */
  totalMs: number;
  /** Time in this node alone, children excluded. */
  selfMs: number;
  /** Share of total execution attributable to this node alone, 0–1. */
  selfShare: number;
  planRows: number;
  /** Total rows across every loop — what a reader cares about. */
  actualRows: number;
  /** Per-loop rows, the figure Postgres estimates against. */
  actualRowsPerLoop: number;
  loops: number;
  /** How far the planner's row estimate was off, as a multiple. */
  estimateFactor: number;
  rowsRemoved: number;
  sortMethod: string | null;
  sortSpaceKb: number | null;
  children: PlanNode[];
};

export type PlanWarning = {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  node: string;
};

export type AnalyzedPlan = {
  root: PlanNode;
  planningMs: number | null;
  executionMs: number | null;
  warnings: PlanWarning[];
  nodeCount: number;
};

const round = (n: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

function describe(raw: RawPlan): string | null {
  return (
    raw["Index Cond"] ??
    raw["Hash Cond"] ??
    raw.Filter ??
    (raw["Join Type"] ? `${raw["Join Type"]} join` : null)
  );
}

function build(raw: RawPlan, counter: { n: number }): PlanNode {
  const children = (raw.Plans ?? []).map((child) => build(child, counter));

  const loops = raw["Actual Loops"] ?? 1;
  // Postgres reports per-loop averages; multiply back out for real cost.
  const totalMs = (raw["Actual Total Time"] ?? 0) * loops;
  const childMs = children.reduce((sum, c) => sum + c.totalMs, 0);
  const actualRowsPerLoop = raw["Actual Rows"] ?? 0;
  const actualRows = actualRowsPerLoop * loops;
  const planRows = raw["Plan Rows"] ?? 0;

  // "Plan Rows" is a per-loop estimate, so it must be compared against the
  // per-loop actual — not the total, which would flag every nested loop.
  const hi = Math.max(planRows, actualRowsPerLoop);
  const lo = Math.max(1, Math.min(planRows, actualRowsPerLoop));

  return {
    id: counter.n++,
    label: raw["Node Type"],
    detail: describe(raw),
    relation: raw["Relation Name"] ?? raw["Index Name"] ?? null,
    totalMs: round(totalMs, 3),
    // Parallel children can sum past the parent; never report negative time.
    selfMs: round(Math.max(0, totalMs - childMs), 3),
    selfShare: 0,
    planRows,
    actualRows,
    actualRowsPerLoop,
    loops,
    estimateFactor: round(hi / lo, 1),
    rowsRemoved: (raw["Rows Removed by Filter"] ?? 0) * loops,
    sortMethod: raw["Sort Method"] ?? null,
    sortSpaceKb: raw["Sort Space Used"] ?? null,
    children,
  };
}

function walk(node: PlanNode, visit: (n: PlanNode) => void) {
  visit(node);
  node.children.forEach((child) => walk(child, visit));
}

/**
 * Under a LIMIT, execution stops early — a top-N sort reports only the rows it
 * emitted, while its estimate still covers the whole set. Comparing the two
 * would report a mis-estimate that isn't real, so those nodes are skipped.
 */
function markTruncated(
  node: PlanNode,
  truncated = false,
  out = new Set<number>(),
) {
  if (truncated) out.add(node.id);
  const below = truncated || node.label === "Limit";
  node.children.forEach((child) => markTruncated(child, below, out));
  return out;
}

function collectWarnings(root: PlanNode, executionMs: number): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const truncated = markTruncated(root);

  walk(root, (node) => {
    const name = node.relation
      ? `${node.label} on ${node.relation}`
      : node.label;

    if (
      node.label === "Seq Scan" &&
      node.actualRows + node.rowsRemoved >= 10_000 &&
      node.rowsRemoved > node.actualRows
    ) {
      warnings.push({
        severity: "high",
        title: "Sequential scan discarding most rows",
        detail: `Read ${(node.actualRows + node.rowsRemoved).toLocaleString()} rows and threw away ${node.rowsRemoved.toLocaleString()} of them. An index on the filtered column would let Postgres skip that work.`,
        node: name,
      });
    }

    if (
      node.estimateFactor >= 10 &&
      !truncated.has(node.id) &&
      Math.max(node.actualRowsPerLoop, node.planRows) >= 500
    ) {
      warnings.push({
        severity: node.estimateFactor >= 100 ? "high" : "medium",
        title: `Row estimate off by ${node.estimateFactor}×`,
        detail: `Planner expected ${node.planRows.toLocaleString()} rows per loop, got ${node.actualRowsPerLoop.toLocaleString()}. Bad estimates cascade into the wrong join strategy — ANALYZE the table, or check for correlated filters.`,
        node: name,
      });
    }

    if (node.sortMethod && node.sortMethod.includes("external")) {
      warnings.push({
        severity: "medium",
        title: "Sort spilled to disk",
        detail: `Used "${node.sortMethod}"${node.sortSpaceKb ? ` and ${node.sortSpaceKb.toLocaleString()} kB` : ""}. work_mem was too small to sort in memory.`,
        node: name,
      });
    }

    if (node.label === "Nested Loop" && node.loops === 1) {
      const inner = node.children[1];
      if (inner && inner.loops >= 1_000) {
        warnings.push({
          severity: "medium",
          title: `Inner side executed ${inner.loops.toLocaleString()} times`,
          detail: `A nested loop re-runs its inner side once per outer row — the query-plan shape of an N+1. A hash join or an index on the join key usually collapses it.`,
          node: name,
        });
      }
    }

    if (executionMs > 0 && node.selfShare >= 0.5 && node.selfMs >= 5) {
      warnings.push({
        severity: "low",
        title: `${Math.round(node.selfShare * 100)}% of runtime in one node`,
        detail: `${node.selfMs} ms spent here, excluding children. This is where the query actually goes.`,
        node: name,
      });
    }
  });

  const rank = { high: 0, medium: 1, low: 2 };
  return warnings.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function analyzeExplain(result: ExplainResult): AnalyzedPlan {
  const counter = { n: 0 };
  const root = build(result.Plan, counter);
  const executionMs = result["Execution Time"] ?? root.totalMs;

  walk(root, (node) => {
    node.selfShare = executionMs > 0 ? node.selfMs / executionMs : 0;
  });

  return {
    root,
    planningMs: result["Planning Time"] ?? null,
    executionMs: result["Execution Time"] ?? null,
    warnings: collectWarnings(root, executionMs),
    nodeCount: counter.n,
  };
}

/** Only these can be EXPLAIN ANALYZE'd safely — everything else would run twice. */
export function isExplainable(sql: string): boolean {
  const stripped = sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (stripped.includes(";") && !/;\s*$/.test(stripped)) return false;
  return /^(select|with)\b/i.test(stripped);
}
