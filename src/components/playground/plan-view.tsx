"use client";

import type {
  AnalyzedPlan,
  PlanNode,
  PlanWarning,
} from "@/lib/playground/plan";

const SEVERITY: Record<PlanWarning["severity"], string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300",
  medium:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-[color:var(--border)] bg-[color:var(--accent-soft)]/40 text-[color:var(--muted)]",
};

/** Scans that read everything are the ones worth flagging visually. */
const isFullScan = (label: string) => label === "Seq Scan";

function Node({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  const share = Math.min(100, Math.round(node.selfShare * 100));
  const misestimated = node.estimateFactor >= 10;

  return (
    <li>
      <div
        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-3"
        style={{ marginLeft: depth ? 16 : 0 }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-mono text-sm font-semibold ${
              isFullScan(node.label)
                ? "text-red-600 dark:text-red-300"
                : "text-[color:var(--text)]"
            }`}
          >
            {node.label}
          </span>
          {node.relation ? (
            <span className="font-mono text-xs text-[color:var(--muted)]">
              on {node.relation}
            </span>
          ) : null}
          {node.loops > 1 ? (
            <span className="rounded border border-[color:var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              ×{node.loops.toLocaleString()} loops
            </span>
          ) : null}
          <span className="ml-auto font-mono text-xs text-[color:var(--muted)]">
            {node.selfMs.toFixed(2)} ms
          </span>
        </div>

        {/* Share of total runtime spent in this node alone */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)]"
            style={{ width: `${share}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[color:var(--muted)]">
          <span>
            rows est {node.planRows.toLocaleString()} → actual{" "}
            <span
              className={
                misestimated
                  ? "font-bold text-amber-600 dark:text-amber-300"
                  : ""
              }
            >
              {node.actualRowsPerLoop.toLocaleString()}
            </span>
            {node.loops > 1
              ? ` (${node.actualRows.toLocaleString()} total)`
              : ""}
            {misestimated ? ` (${node.estimateFactor}× off)` : ""}
          </span>
          {node.rowsRemoved > 0 ? (
            <span>discarded {node.rowsRemoved.toLocaleString()}</span>
          ) : null}
          {node.sortMethod ? <span>{node.sortMethod}</span> : null}
          <span>{share}% of runtime</span>
        </div>

        {node.detail ? (
          <p
            className="mt-2 truncate font-mono text-[11px] text-[color:var(--muted)]"
            title={node.detail}
          >
            {node.detail}
          </p>
        ) : null}
      </div>

      {node.children.length > 0 ? (
        <ul className="mt-2 grid gap-2 border-l border-dashed border-[color:var(--border)] pl-2">
          {node.children.map((child) => (
            <Node key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function PlanView({ plan }: { plan: AnalyzedPlan }) {
  return (
    <div className="grid gap-4 p-4">
      <div className="flex flex-wrap gap-3">
        {[
          {
            label: "Planning",
            value:
              plan.planningMs !== null
                ? `${plan.planningMs.toFixed(2)} ms`
                : "—",
          },
          {
            label: "Execution",
            value:
              plan.executionMs !== null
                ? `${plan.executionMs.toFixed(2)} ms`
                : "—",
          },
          { label: "Plan nodes", value: String(plan.nodeCount) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--muted)]">
              {stat.label}
            </p>
            <p className="font-mono text-sm font-semibold text-[color:var(--text)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {plan.warnings.length > 0 ? (
        <ul className="grid gap-2">
          {plan.warnings.map((warning, i) => (
            <li
              key={i}
              className={`rounded-xl border p-3 ${SEVERITY[warning.severity]}`}
            >
              <p className="text-sm font-semibold">{warning.title}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                {warning.detail}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[color:var(--muted)]">
                {warning.node}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-[color:var(--border)] bg-[color:var(--accent-soft)]/40 p-3 text-sm text-[color:var(--muted)]">
          No problems detected in this plan.
        </p>
      )}

      <ul className="grid gap-2">
        <Node node={plan.root} />
      </ul>
    </div>
  );
}
