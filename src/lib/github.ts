/**
 * Shared GitHub client + helpers for request-record I/O.
 *
 * All writes target `requests/<id>.json` on the production branch (`main`).
 * Every write is SHA-conditional — see spec/pipeline-mvp.md § Optimistic
 * concurrency.
 *
 * **Exported write surface is intentionally narrow.** The only writer is
 * `putRequestFile(gh, id, ...)` — there is no generic put-anywhere-on-main
 * helper. A future caller cannot widen the metadata-write exception by
 * passing a different `path`. Id validation lives in `requestPath()`,
 * which `putRequestFile` calls before any Octokit call.
 *
 * See CLAUDE.md § Request/publish pipeline rules § rule 4 and
 * spec/pipeline-mvp.md § Architecture > main write exception.
 */

import { Octokit } from "octokit";

export type GithubConfig = {
  octokit: Octokit;
  owner: string;
  repo: string;
};

/**
 * Request id shape — see spec/pipeline-mvp.md § Request id + slug rules.
 *
 *   YYYYMMDD-HHmmss-<6 lowercase alnum>
 *
 * Anchored. No leading or trailing characters. Lowercase only.
 */
const REQUEST_ID_PATTERN = /^\d{8}-\d{6}-[a-z0-9]{6}$/;

/** True iff `id` is a string matching the documented request-id format. */
export function isValidRequestId(id: unknown): id is string {
  return typeof id === "string" && REQUEST_ID_PATTERN.test(id);
}

/**
 * Maps a request id to the EXACT path on `main` where its metadata lives:
 * `requests/<id>.json`. Throws if `id` doesn't match the documented
 * format — this throw is the central guard that keeps the metadata-write
 * exception narrow.
 *
 * Both the only-exported writer (`putRequestFile`) and the
 * `request-store.ts` reader funnel through this helper, so an invalid id
 * never reaches an Octokit call.
 */
export function requestPath(id: string): string {
  if (!isValidRequestId(id)) {
    throw new Error(
      `Invalid request id: ${JSON.stringify(id)}. Expected YYYYMMDD-HHmmss-<6 lowercase alnum>.`
    );
  }
  return `requests/${id}.json`;
}

/**
 * Reads the GitHub config from env vars and returns a ready-to-use client.
 * Throws if either env var is missing — callers should catch and respond
 * with a server-misconfigured error.
 */
export function githubClient(): GithubConfig {
  const token = process.env.GITHUB_TOKEN;
  const repoEnv = process.env.GITHUB_REPO;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  if (!repoEnv) throw new Error("GITHUB_REPO is not set (expected `owner/repo`)");
  const slash = repoEnv.indexOf("/");
  if (slash <= 0 || slash === repoEnv.length - 1) {
    throw new Error(`GITHUB_REPO must look like 'owner/repo', got: ${repoEnv}`);
  }
  const owner = repoEnv.slice(0, slash);
  const repo = repoEnv.slice(slash + 1);
  return { octokit: new Octokit({ auth: token }), owner, repo };
}

/**
 * Returns the contents of a file on `main` along with its blob SHA, or null
 * if the file does not exist. Throws for any non-404 error.
 */
export async function getMainFile<T>(
  { octokit, owner, repo }: GithubConfig,
  path: string
): Promise<{ data: T; sha: string } | null> {
  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: "main",
    });
    if (Array.isArray(res.data) || !("content" in res.data)) return null;
    const raw = Buffer.from(res.data.content, "base64").toString("utf-8");
    return { data: JSON.parse(raw) as T, sha: res.data.sha };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      (err as { status: number }).status === 404
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * SHA-conditional write of `requests/<id>.json` on `main` — the ONLY
 * exported write helper.
 *
 * The path is derived from `id` via `requestPath()`, so the caller can't
 * pass an arbitrary path. Invalid ids throw before any Octokit call.
 *
 * Pass `sha: undefined` ONLY for first writes where the file does not yet
 * exist (initial intake). Caller is responsible for retry-on-409 per the
 * spec's CAS rules (handled by `request-store.ts` `updateRequest`).
 */
export async function putRequestFile(
  { octokit, owner, repo }: GithubConfig,
  id: string,
  message: string,
  body: unknown,
  sha?: string
): Promise<{ commitSha: string; contentSha: string }> {
  const path = requestPath(id);
  const content = Buffer.from(JSON.stringify(body, null, 2)).toString("base64");
  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch: "main",
    path,
    message,
    content,
    sha,
  });
  return {
    commitSha: res.data.commit.sha ?? "",
    contentSha: res.data.content?.sha ?? "",
  };
}

/**
 * Lists files in a directory on `main`. Returns just the file names. Empty
 * array if the directory does not exist yet.
 */
export async function listMainDir(
  { octokit, owner, repo }: GithubConfig,
  path: string
): Promise<Array<{ name: string; path: string; sha: string }>> {
  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: "main",
    });
    if (!Array.isArray(res.data)) return [];
    return res.data
      .filter((entry) => entry.type === "file")
      .map((entry) => ({ name: entry.name, path: entry.path, sha: entry.sha }));
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      (err as { status: number }).status === 404
    ) {
      return [];
    }
    throw err;
  }
}
