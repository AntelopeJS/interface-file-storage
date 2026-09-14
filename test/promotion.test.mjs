import { test } from "node:test";
import assert from "node:assert/strict";

import storage from "../dist/index.js";

const SOURCE = "__staging__/tenant-a/document-b.txt";
const DESTINATION = "tenant-a/document-b.txt";
const STORAGE = "private-documents";

function rejectLegacyPromotion(context) {
  for (const operation of ["moveFile", "fileExists"]) {
    context.mock.method(storage.internal, operation, () => {
      assert.fail(`Promotion must not call ${operation}`);
    });
  }
}

test("promotion delegates the exact staged key and storage to the provider", async (t) => {
  rejectLegacyPromotion(t);
  const response = { resourceKey: DESTINATION };
  const result = Promise.resolve(response);
  const promote = t.mock.method(storage.internal, "promoteFile", () => result);
  assert.equal(storage.PromoteFile(SOURCE, STORAGE), result);
  assert.equal(await result, response);
  assert.deepEqual(promote.mock.calls[0].arguments, [SOURCE, STORAGE]);
  assert.equal(promote.mock.callCount(), 1);
});

test("non-staged keys and omitted storage also use the provider hook", async (t) => {
  rejectLegacyPromotion(t);
  const response = { resourceKey: DESTINATION };
  const promote = t.mock.method(
    storage.internal,
    "promoteFile",
    async () => response,
  );
  assert.equal(await storage.PromoteFile(DESTINATION), response);
  assert.deepEqual(promote.mock.calls[0].arguments, [DESTINATION, undefined]);
});

const failures = [
  new storage.FileConflictError(DESTINATION),
  new storage.FileNotFoundError(SOURCE),
  new Error("Publication acknowledgment was lost"),
];

for (const failure of failures) {
  test(`promotion preserves ${failure.name} without retry or existence fallback`, async (t) => {
    rejectLegacyPromotion(t);
    const promote = t.mock.method(storage.internal, "promoteFile", async () => {
      throw failure;
    });
    await assert.rejects(
      storage.PromoteFile(SOURCE, STORAGE),
      (error) => error === failure,
    );
    assert.equal(promote.mock.callCount(), 1);
  });
}

test("generic MoveFile retains independent forwarding", async (t) => {
  const move = t.mock.method(storage.internal, "moveFile", async () => {});
  t.mock.method(storage.internal, "promoteFile", () =>
    assert.fail("Unexpected promotion"),
  );
  await storage.MoveFile("ordinary-source", "occupied-destination", STORAGE);
  assert.deepEqual(move.mock.calls[0].arguments, [
    "ordinary-source",
    "occupied-destination",
    STORAGE,
  ]);
});

test("upload forwarding preserves private visibility and required conditional headers", async (t) => {
  const request = {
    filename: "document.txt",
    size: 17,
    mimetype: "text/plain",
    visibility: "private",
    staging: true,
  };
  const response = {
    uploadUrl: "https://storage.invalid/upload",
    resourceKey: SOURCE,
    expiresAt: 1234,
    headers: { "If-None-Match": "*" },
  };
  const create = t.mock.method(
    storage.internal,
    "createUploadUrl",
    async () => response,
  );
  assert.equal(
    await storage.CreateUploadUrl(request, undefined, STORAGE),
    response,
  );
  assert.equal(create.mock.calls[0].arguments[0], request);
  assert.deepEqual(create.mock.calls[0].arguments, [
    request,
    undefined,
    STORAGE,
  ]);
});

test("conflict errors are distinct from missing files", () => {
  const conflict = new storage.FileConflictError(DESTINATION);
  assert.ok(conflict instanceof Error);
  assert.equal(conflict instanceof storage.FileNotFoundError, false);
  assert.equal(conflict.name, "FileConflictError");
  assert.equal(conflict.code, "FILE_CONFLICT");
  assert.equal(conflict.message, `File conflict: ${DESTINATION}`);
});

test("canonical promotion strips only the leading staging prefix", () => {
  assert.equal(storage.stripStagingPrefix(SOURCE), DESTINATION);
  assert.equal(
    storage.stripStagingPrefix("ordinary/__staging__/nested"),
    "ordinary/__staging__/nested",
  );
  assert.equal(
    storage.stripStagingPrefix("__staging__/tenant/__staging__/nested"),
    "tenant/__staging__/nested",
  );
});
