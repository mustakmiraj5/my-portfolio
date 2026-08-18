export type Snippet = {
  label: string;
  hint: string;
  sql: string;
};

/**
 * The heavy half of a dataset — schema, seed data and guided queries. Kept in
 * its own module per dataset so the bundler can split it out and fetch it only
 * when that dataset is selected.
 */
export type DatasetModule = {
  sql: string;
  snippets: Snippet[];
};

/**
 * The light half — everything the dataset dropdown needs to render before any
 * SQL has been downloaded.
 */
export type DatasetMeta = {
  id: string;
  name: string;
  tagline: string;
  tables: number;
  size: string;
  /**
   * Seeds the editor on first paint. The editor's initial value is set
   * synchronously, so it cannot wait on a dynamically imported module — this
   * is a standalone starter query, not a copy of the first snippet.
   */
  starterSql: string;
};
