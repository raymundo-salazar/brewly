/** Describes the package metadata returned by the npm registry. */
export interface LatestPackageMetadata {
  version?: unknown;
}

/** Describes the optional dependencies used by the update checker. */
export interface UpdateCheckOptions {
  fetcher?: UpdateFetcher;
  registryUrl?: string;
  timeoutMs?: number;
}

/** Describes the minimal response contract required from a registry client. */
export interface UpdateResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

/** Describes the injectable registry request function used by the update checker. */
export type UpdateFetcher = (
  url: string,
  options: { signal: AbortSignal },
) => Promise<UpdateResponse>;

/** Describes an available Brewly update. */
export interface UpdateResult {
  command: string;
  currentVersion: string;
  latestVersion: string;
}
