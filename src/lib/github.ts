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

/**
 * Stored attachment filename shape. Generated entirely server-side from
 * the upload index and a 6-char random — the user's original filename
 * is NEVER used as a path component. See `src/lib/attachments.ts` for
 * the generator and `spec/pipeline-mvp.md` § Attachments for rationale.
 *
 *   <index 1-3>-<6 lowercase alnum>.<png|jpg|webp>
 */
const ATTACHMENT_NAME_PATTERN = /^[1-3]-[a-z0-9]{6}\.(png|jpg|webp)$/;

/** True iff `id` is a string matching the documented request-id format. */
export function isValidRequestId(id: unknown): id is string {
  return typeof id === "string" && REQUEST_ID_PATTERN.test(id);
}

/** True iff `name` matches the server-generated attachment filename shape. */
export function isValidAttachmentName(name: unknown): name is string {
  return typeof name === "string" && ATTACHMENT_NAME_PATTERN.test(name);
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
 * Maps a request id + a server-generated attachment filename to the EXACT
 * path on `main`: `requests/<id>/attachments/<name>`. Throws if either
 * input is malformed.
 *
 * Both `id` AND `name` must be validated independently — `id` against the
 * documented request-id format, `name` against the server-generated
 * attachment-filename shape (`<index>-<rand6>.<ext>`). This is the
 * central guard that keeps the metadata-write exception narrow for the
 * attachments sub-tree as well: a caller cannot construct an arbitrary
 * sub-path because the only inputs are id (operator/server) and name
 * (server-generated only).
 */
export function attachmentPath(id: string, name: string): string {
  if (!isValidRequestId(id)) {
    throw new Error(
      `Invalid request id: ${JSON.stringify(id)}. Expected YYYYMMDD-HHmmss-<6 lowercase alnum>.`
    );
  }
  if (!isValidAttachmentName(name)) {
    throw new Error(
      `Invalid attachment name: ${JSON.stringify(name)}. Expected <1-3>-<6 lowercase alnum>.<png|jpg|webp>.`
    );
  }
  return `requests/${id}/attachments/${name}`;
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
 * Writes a binary attachment file under `requests/<id>/attachments/<name>`
 * on `main`. Both `id` and `name` are validated via `attachmentPath()`
 * before any Octokit call. The caller passes already-base64-encoded
 * content (the GitHub Contents API requires base64 regardless of
 * payload size).
 *
 * Returns the new blob SHA so the caller can store it for later
 * authenticated retrieval via `getMainBlob()`.
 *
 * No `sha` parameter — initial create only. Re-uploading an attachment
 * over an existing one is not part of the v1 flow (form rejects three+
 * files and each upload generates a fresh random suffix, so name
 * collisions are negligible).
 */
export async function putAttachmentFile(
  { octokit, owner, repo }: GithubConfig,
  id: string,
  name: string,
  message: string,
  contentBase64: string
): Promise<{ contentSha: string }> {
  const path = attachmentPath(id, name);
  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch: "main",
    path,
    message,
    content: contentBase64,
  });
  return { contentSha: res.data.content?.sha ?? "" };
}

/**
 * Low-level delete of a file on `main` by path. PRIVATE — intentionally
 * NOT exported, so no caller outside this module can delete an arbitrary
 * path. The only public delete entry point is `deleteAttachmentFile`,
 * which derives the path from a validated request id + attachment name.
 */
async function deleteMainFileByPath(
  { octokit, owner, repo }: GithubConfig,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    branch: "main",
    path,
    sha,
    message,
  });
}

/**
 * Deletes a request attachment blob (`requests/<id>/attachments/<name>`)
 * on `main`. Used for best-effort rollback of orphaned blobs when a
 * multi-attachment intake fails partway.
 *
 * The path is derived internally via `attachmentPath(id, name)`, which
 * validates both the request id and the server-generated attachment name
 * before any Octokit call. Callers pass a validated id + name, never an
 * arbitrary path — this keeps the delete surface as narrow as the write
 * surface (`putRequestFile` / `putAttachmentFile`).
 */
export async function deleteAttachmentFile(
  gh: GithubConfig,
  id: string,
  name: string,
  sha: string,
  message: string
): Promise<void> {
  const path = attachmentPath(id, name);
  await deleteMainFileByPath(gh, path, sha, message);
}

/**
 * Fetches a blob by SHA from GitHub. Used by the attachment-serving
 * proxy route to stream a stored image back to an authenticated admin
 * client. `getBlob` works regardless of file size, unlike the Contents
 * API which silently switches to a placeholder for files >1 MB.
 *
 * Returns the raw bytes (base64-decoded from GitHub's response).
 */
export async function getMainBlob(
  { octokit, owner, repo }: GithubConfig,
  sha: string
): Promise<Uint8Array> {
  const res = await octokit.rest.git.getBlob({ owner, repo, file_sha: sha });
  return new Uint8Array(Buffer.from(res.data.content, "base64"));
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
