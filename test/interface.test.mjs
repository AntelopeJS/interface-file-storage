import { test } from "node:test";
import assert from "node:assert/strict";

import storage from "../dist/index.js";

const source = {
  storageId: "store-incarnation-a",
  resourceKey: "__staging__/upload-a",
  generation: "upload-occurrence-a",
};
const request = {
  source,
  destinationKey: "__sealed__/attachment-b",
  admissionId: "admission-c",
};
const metadata = {
  resourceKey: source.resourceKey,
  filename: "original.txt",
  size: 7,
  mimetype: "text/plain",
  lastModified: 1234,
};
const snapshot = { identity: source, metadata };
const sealed = {
  identity: {
    ...source,
    resourceKey: request.destinationKey,
    generation: "sealed-d",
  },
  metadata: { ...metadata, resourceKey: request.destinationKey },
  provenance: { admissionId: request.admissionId, source },
};
const operations = [
  {
    name: "GetFileSnapshot",
    binding: "getFileSnapshot",
    input: source.resourceKey,
    output: snapshot,
  },
  { name: "SealFile", binding: "sealFile", input: request, output: sealed },
  {
    name: "GetFileSeal",
    binding: "getFileSeal",
    input: request,
    output: { status: "sealed", file: sealed },
  },
  {
    name: "RemoveSealedFile",
    binding: "removeSealedFile",
    input: request,
    output: { status: "removed" },
  },
];

for (const { name, binding, input, output } of operations) {
  test(`${name} forwards exact input and selected storage`, async (t) => {
    const handler = t.mock.method(
      storage.internal,
      binding,
      async () => output,
    );
    assert.equal(await storage[name](input, "secondary-alias"), output);
    assert.deepEqual(handler.mock.calls[0].arguments, [
      input,
      "secondary-alias",
    ]);
    assert.equal(handler.mock.calls[0].arguments[0], input);
  });

  test(`${name} preserves omitted storage and unknown outcomes`, async (t) => {
    const error = new storage.FileSealError(
      "Response was lost",
      "OUTCOME_UNKNOWN",
    );
    const handler = t.mock.method(storage.internal, binding, async () => {
      throw error;
    });
    await assert.rejects(
      storage[name](input),
      (received) => received === error,
    );
    assert.deepEqual(handler.mock.calls[0].arguments, [input, undefined]);
    assert.equal(handler.mock.callCount(), 1);
  });
}

test("seal states remain distinguishable through the public read API", async (t) => {
  const states = [{ status: "absent" }, { status: "removed" }];
  for (const state of states) {
    const handler = t.mock.method(
      storage.internal,
      "getFileSeal",
      async () => state,
    );
    assert.equal(await storage.GetFileSeal(request), state);
    handler.mock.restore();
  }
});

test("typed errors retain their code and Error identity", () => {
  const error = new storage.FileSealError(
    "Terminal admission",
    "ADMISSION_REMOVED",
  );
  assert.ok(error instanceof Error);
  assert.equal(error.name, "FileSealError");
  assert.equal(error.message, "Terminal admission");
  assert.equal(error.code, "ADMISSION_REMOVED");
  assert.equal(storage.SEALED_PREFIX, "__sealed__/");
});

test("legacy staged promotion still delegates move and checks existence", async (t) => {
  const move = t.mock.method(storage.internal, "moveFile", async () => {});
  const exists = t.mock.method(
    storage.internal,
    "fileExists",
    async () => true,
  );
  assert.deepEqual(await storage.PromoteFile(source.resourceKey, "legacy"), {
    resourceKey: "upload-a",
  });
  assert.deepEqual(move.mock.calls[0].arguments, [
    source.resourceKey,
    "upload-a",
    "legacy",
  ]);
  assert.deepEqual(exists.mock.calls[0].arguments, ["upload-a", "legacy"]);
});

test("legacy permanent promotion remains a no-op", async (t) => {
  const move = t.mock.method(storage.internal, "moveFile", async () => {});
  assert.deepEqual(await storage.PromoteFile("permanent"), {
    resourceKey: "permanent",
  });
  assert.equal(move.mock.callCount(), 0);
});
