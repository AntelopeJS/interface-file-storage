import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  CreateReadUrl,
  CreateUploadUrl,
  DeleteFile,
  FileConflictError,
  FileExists,
  FileNotFoundError,
  GetFileMetadata,
  isStagedKey,
  MoveFile,
  type PresignedUploadResponse,
  PromoteFile,
  stripStagingPrefix,
  toStagedKey,
  UploadValidationError,
  type Visibility,
} from "../index";

const CONTENT = "shared storage contract: asymmetric bytes";
const REPLACEMENT = "X".repeat(CONTENT.length);
const FILENAME = "contract.txt";
const MIMETYPE = "text/plain";
const REQUEST_TIMEOUT = 10_000;
const SUITE_TIMEOUT = 30_000;
const READ_EXPIRY = 60;
const CONFLICT_STATUSES = [409, 412];
const VISIBILITIES: Visibility[] = ["private", "public"];
const cleanup = new Set<string>();

async function request(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
}

async function upload(
  visibility: Visibility,
): Promise<PresignedUploadResponse> {
  const result = await CreateUploadUrl(
    {
      filename: FILENAME,
      size: Buffer.byteLength(CONTENT),
      mimetype: MIMETYPE,
      path: `interface-tests/${randomUUID()}`,
      metadata: { source: "contract", visibility: "untrusted" },
      visibility,
      staging: true,
    },
    { maxSize: Buffer.byteLength(CONTENT), allowedMimetypes: [MIMETYPE] },
  );
  cleanup.add(result.resourceKey);
  cleanup.add(stripStagingPrefix(result.resourceKey));
  assert.ok(isStagedKey(result.resourceKey));
  assert.ok(result.expiresAt > Date.now());
  const response = await request(result.uploadUrl, {
    method: "PUT",
    headers: result.headers,
    body: CONTENT,
  });
  assert.ok(response.ok, `Upload ${response.status}: ${await response.text()}`);
  return result;
}

async function assertReadable(
  key: string,
  visibility: Visibility,
): Promise<void> {
  const read = await CreateReadUrl(key, READ_EXPIRY);
  if (visibility === "private") assert.ok((read.expiresAt ?? 0) > Date.now());
  else assert.equal(read.expiresAt, undefined);
  const response = await request(read.url);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), CONTENT);
}

async function assertMetadata(key: string): Promise<void> {
  const metadata = await GetFileMetadata(key);
  assert.equal(metadata.resourceKey, key);
  assert.equal(metadata.filename, FILENAME);
  assert.equal(metadata.size, Buffer.byteLength(CONTENT));
  assert.equal(metadata.mimetype, MIMETYPE);
  assert.ok(metadata.lastModified > 0);
  assert.equal(metadata.metadata?.source, "contract");
  assert.equal(metadata.metadata?.visibility, "untrusted");
}

describe("[interface-file-storage] shared conformance", function () {
  this.timeout(SUITE_TIMEOUT);

  afterEach(async () => {
    const keys = [...cleanup];
    cleanup.clear();
    await Promise.all(keys.map((key) => DeleteFile(key)));
  });

  for (const visibility of VISIBILITIES) {
    it(`preserves ${visibility} bytes, metadata and visibility through promotion and replay`, async () => {
      const staged = await upload(visibility);
      await assertReadable(staged.resourceKey, visibility);
      await assertMetadata(staged.resourceKey);
      const canonical = stripStagingPrefix(staged.resourceKey);
      const promoted = await PromoteFile(staged.resourceKey);
      assert.equal(promoted.resourceKey, canonical);
      assert.equal(await FileExists(staged.resourceKey), false);
      assert.equal(await FileExists(canonical), true);
      assert.equal(
        (await PromoteFile(staged.resourceKey)).resourceKey,
        canonical,
      );
      assert.equal((await PromoteFile(canonical)).resourceKey, canonical);
      await assertMetadata(canonical);
      await assertReadable(canonical, visibility);
    });
  }

  it("rejects upload replay without replacing accepted bytes", async () => {
    const staged = await upload("private");
    const replay = await request(staged.uploadUrl, {
      method: "PUT",
      headers: staged.headers,
      body: REPLACEMENT,
    });
    const detail = await replay.text();
    assert.ok(
      CONFLICT_STATUSES.includes(replay.status),
      `${replay.status}: ${detail}`,
    );
    await assertReadable(staged.resourceKey, "private");
    await assertMetadata(staged.resourceKey);
  });

  it("does not treat an existing destination as proof of promotion", async () => {
    const staged = await upload("private");
    const canonical = stripStagingPrefix(staged.resourceKey);
    await MoveFile(staged.resourceKey, canonical);
    assert.equal(await FileExists(staged.resourceKey), false);
    await assert.rejects(
      () => PromoteFile(staged.resourceKey),
      FileConflictError,
    );
    await assertReadable(canonical, "private");
  });

  it("reports a missing staging source without creating a destination", async () => {
    const canonical = `interface-tests/${randomUUID()}/absent.txt`;
    await assert.rejects(
      () => PromoteFile(toStagedKey(canonical)),
      FileNotFoundError,
    );
    assert.equal(await FileExists(canonical), false);
    await assert.rejects(() => GetFileMetadata(canonical), FileNotFoundError);
  });

  it("returns a non-staged key unchanged without requiring a stored object", async () => {
    const key = `interface-tests/${randomUUID()}/unchanged.txt`;
    assert.equal((await PromoteFile(key)).resourceKey, key);
    assert.equal(await FileExists(key), false);
  });

  it("deletes files and tolerates repeated cleanup", async () => {
    const staged = await upload("private");
    await DeleteFile(staged.resourceKey);
    await DeleteFile(staged.resourceKey);
    assert.equal(await FileExists(staged.resourceKey), false);
    await assert.rejects(
      () => GetFileMetadata(staged.resourceKey),
      FileNotFoundError,
    );
  });

  it("rejects an upload above the caller's size limit", async () => {
    await assert.rejects(
      () =>
        CreateUploadUrl(
          { filename: FILENAME, size: CONTENT.length, mimetype: MIMETYPE },
          { maxSize: CONTENT.length - 1 },
        ),
      (error: unknown) =>
        error instanceof UploadValidationError &&
        error.code === "SIZE_EXCEEDED",
    );
  });

  it("rejects an upload outside the caller's MIME allowlist", async () => {
    await assert.rejects(
      () =>
        CreateUploadUrl(
          { filename: FILENAME, size: CONTENT.length, mimetype: MIMETYPE },
          { allowedMimetypes: ["image/png"] },
        ),
      (error: unknown) =>
        error instanceof UploadValidationError &&
        error.code === "MIMETYPE_NOT_ALLOWED",
    );
  });
});
