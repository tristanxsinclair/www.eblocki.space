export interface BuildInfo {
  commitSha: string | null;
  shortCommitSha: string | null;
  buildTimestamp: string | null;
  buildId: string | null;
  environment: string | null;
  appVersion: string | null;
}

type RawBuildInfo = Partial<Omit<BuildInfo, "shortCommitSha">> | null | undefined;

declare const __EBLOCKI_BUILD_INFO__: RawBuildInfo;

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normaliseBuildInfo(raw: RawBuildInfo): BuildInfo {
  const commitSha = clean(raw?.commitSha);

  return {
    commitSha,
    shortCommitSha: commitSha ? commitSha.slice(0, 12) : null,
    buildTimestamp: clean(raw?.buildTimestamp),
    buildId: clean(raw?.buildId),
    environment: clean(raw?.environment),
    appVersion: clean(raw?.appVersion),
  };
}

export const buildInfo = normaliseBuildInfo(
  typeof __EBLOCKI_BUILD_INFO__ === "undefined" ? null : __EBLOCKI_BUILD_INFO__,
);
