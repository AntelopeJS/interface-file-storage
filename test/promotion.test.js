const { mock } = require("node:test");
const assert = require("node:assert/strict");

const storage = require("../dist/index.js");

afterEach(() => mock.restoreAll());

const SOURCE = "__staging__/tenant-a/document-b.txt";
const DESTINATION = "tenant-a/document-b.txt";
const STORAGE = "private-documents";

function rejectLegacyPromotion() {
  for (const operation of ["moveFile", "fileExists"]) {
    mock.method(storage.internal, operation, () => {
      assert.fail(`Promotion must not call ${operation}`);
    });
  }
}

it("promotion delegates the exact staged key and storage to the provider", async () => {
  rejectLegacyPromotion();
  const response = { resourceKey: DESTINATION };
  const result = Promise.resolve(response);
  const promote = mock.method(storage.internal, "promoteFile", () => result);
  assert.equal(storage.PromoteFile(SOURCE, STORAGE), result);
  assert.equal(await result, response);
  assert.deepEqual(promote.mock.calls[0].arguments, [SOURCE, STORAGE]);
  assert.equal(promote.mock.callCount(), 1);
});

it("non-staged keys and omitted storage also use the provider hook", async () => {
  rejectLegacyPromotion();
  const response = { resourceKey: DESTINATION };
  const promote = mock.method(
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
  it(`promotion preserves ${failure.name} without retry or existence fallback`, async () => {
    rejectLegacyPromotion();
    const promote = mock.method(storage.internal, "promoteFile", async () => {
      throw failure;
    });
    await assert.rejects(
      storage.PromoteFile(SOURCE, STORAGE),
      (error) => error === failure,
    );
    assert.equal(promote.mock.callCount(), 1);
  });
}

it("generic MoveFile retains independent forwarding", async () => {
  const move = mock.method(storage.internal, "moveFile", async () => {});
  mock.method(storage.internal, "promoteFile", () =>
    assert.fail("Unexpected promotion"),
  );
  await storage.MoveFile("ordinary-source", "occupied-destination", STORAGE);
  assert.deepEqual(move.mock.calls[0].arguments, [
    "ordinary-source",
    "occupied-destination",
    STORAGE,
  ]);
});

it("upload forwarding preserves private visibility and required conditional headers", async () => {
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
  const create = mock.method(
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

it("conflict errors are distinct from missing files", () => {
  const conflict = new storage.FileConflictError(DESTINATION);
  assert.ok(conflict instanceof Error);
  assert.equal(conflict instanceof storage.FileNotFoundError, false);
  assert.equal(conflict.name, "FileConflictError");
  assert.equal(conflict.code, "FILE_CONFLICT");
  assert.equal(conflict.message, `File conflict: ${DESTINATION}`);
});

it("canonical promotion strips only the leading staging prefix", () => {
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

describe("IsFileNotFoundError", () => {
  const BRAND = Symbol.for(
    "@antelopejs/interface-file-storage/FileNotFoundError",
  );

  it("accepts a FileNotFoundError", () => {
    assert.equal(
      storage.IsFileNotFoundError(new storage.FileNotFoundError("a")),
      true,
    );
  });

  /**
   * @param {unknown} value
   * @returns {value is object}
   */
  function isObject(value) {
    return typeof value === "object" && value !== null;
  }

  /**
   * @param {unknown} value
   * @returns {value is Function}
   */
  function isFunction(value) {
    return typeof value === "function";
  }

  /**
   * @param {unknown} copy
   * @param {string} key
   * @returns {unknown}
   */
  function constructFrom(copy, key) {
    assert.ok(isObject(copy));
    assert.ok("FileNotFoundError" in copy);
    assert.ok(isFunction(copy.FileNotFoundError));
    assert.notEqual(copy.FileNotFoundError, storage.FileNotFoundError);
    return Reflect.construct(copy.FileNotFoundError, [key]);
  }

  it("accepts an error built by a second copy of the package", () => {
    const copyPath = require.resolve("../dist/index.js");
    const first = storage;
    delete require.cache[copyPath];
    const error = constructFrom(require(copyPath), "a");
    assert.equal(error instanceof first.FileNotFoundError, false);
    assert.equal(first.IsFileNotFoundError(error), true);
  });

  it("rejects a value whose brand is only inherited", () => {
    const inherited = { __proto__: new storage.FileNotFoundError("a") };
    assert.equal(Object.hasOwn(inherited, BRAND), false);
    assert.equal(
      storage.IsFileNotFoundError(Object.getPrototypeOf(inherited)),
      true,
    );
    assert.equal(storage.IsFileNotFoundError(inherited), false);
  });

  it("rejects a brand that is not exactly true", () => {
    const fake = Object.defineProperty(new Error("a"), BRAND, { value: 1 });
    assert.equal(storage.IsFileNotFoundError(fake), false);
  });

  it("rejects non-errors and plain errors", () => {
    for (const value of [
      null,
      undefined,
      "File not found",
      42,
      {},
      new Error("a"),
    ]) {
      assert.equal(storage.IsFileNotFoundError(value), false);
    }
  });
});
