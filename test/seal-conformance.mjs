import { test } from "node:test";
import assert from "node:assert/strict";

const ORIGINAL_BYTES = "original-content";
const REPLAY_BYTES = "replayed-content-with-different-length";

async function prepare(factory, context) {
  const fixture = await factory();
  context.after(() => fixture.dispose());
  await fixture.upload("__staging__/source", ORIGINAL_BYTES);
  const snapshot = await fixture.api.GetFileSnapshot("__staging__/source");
  const request = {
    source: snapshot.identity,
    destinationKey: "__sealed__/destination",
    admissionId: "admission-a",
  };
  return { fixture, snapshot, request };
}

/**
 * Registers backend tests. Each factory call supplies isolated disposable storage:
 * api (the four public seal functions), upload(key, text), read(key), exists(key),
 * expireSource(key), restart(), and dispose(), all asynchronous. Upload must use
 * the real upload path; restart preserves durable state but discards process state.
 * read/exists resolve logical keys. No production or shared storage is permitted.
 */
export function registerSealConformance(factory) {
  registerPublicationTests(factory);
  registerConcurrentPublicationTest(factory);
  registerOwnershipTest(factory);
  registerIdentityTests(factory);
  registerChangedSourceTest(factory);
  registerStorageMismatchTest(factory);
  registerRemovalTests(factory);
  registerAdmissionReuseTest(factory);
}

function registerPublicationTests(factory) {
  test("seal preserves source and replays after source expiry and restart", async (t) => {
    const { fixture, snapshot, request } = await prepare(factory, t);
    const sealed = await fixture.api.SealFile(request);
    assert.equal(await fixture.read(request.destinationKey), ORIGINAL_BYTES);
    assert.equal(
      await fixture.read(request.source.resourceKey),
      ORIGINAL_BYTES,
    );
    assert.equal(sealed.identity.resourceKey, request.destinationKey);
    assert.equal(sealed.identity.storageId, snapshot.identity.storageId);
    assert.deepEqual(sealed.provenance, {
      admissionId: request.admissionId,
      source: request.source,
    });
    assert.equal(sealed.metadata.size, Buffer.byteLength(ORIGINAL_BYTES));
    await fixture.expireSource(request.source.resourceKey);
    await fixture.restart();
    assert.deepEqual(await fixture.api.SealFile(request), sealed);
    assert.deepEqual(await fixture.api.GetFileSeal(request), {
      status: "sealed",
      file: sealed,
    });
  });
}

function registerConcurrentPublicationTest(factory) {
  test("concurrent matching publications return the same identity", async (t) => {
    const { fixture, request } = await prepare(factory, t);
    const [first, second] = await Promise.all([
      fixture.api.SealFile(request),
      fixture.api.SealFile(request),
    ]);
    assert.deepEqual(first, second);
    assert.equal(await fixture.read(request.destinationKey), ORIGINAL_BYTES);
  });
}

function registerOwnershipTest(factory) {
  test("different admissions cannot clobber one destination", async (t) => {
    const { fixture, request } = await prepare(factory, t);
    const sealed = await fixture.api.SealFile(request);
    await assert.rejects(
      fixture.api.SealFile({ ...request, admissionId: "other" }),
      {
        code: "DESTINATION_CONFLICT",
      },
    );
    assert.deepEqual(await fixture.api.GetFileSeal(request), {
      status: "sealed",
      file: sealed,
    });
    assert.equal(await fixture.read(request.destinationKey), ORIGINAL_BYTES);
  });
}

function registerIdentityTests(factory) {
  test("identical-byte upload replay creates a distinct generation", async (t) => {
    const { fixture, snapshot, request } = await prepare(factory, t);
    await fixture.upload(request.source.resourceKey, ORIGINAL_BYTES);
    const replay = await fixture.api.GetFileSnapshot(
      request.source.resourceKey,
    );
    assert.equal(replay.identity.storageId, snapshot.identity.storageId);
    assert.notEqual(replay.identity.generation, snapshot.identity.generation);
    await fixture.restart();
    assert.deepEqual(
      await fixture.api.GetFileSnapshot(request.source.resourceKey),
      replay,
    );
  });
}

function registerChangedSourceTest(factory) {
  test("changed source can never substitute replay bytes for expected bytes", async (t) => {
    const { fixture, request } = await prepare(factory, t);
    await fixture.upload(request.source.resourceKey, REPLAY_BYTES);
    const outcome = await fixture.api.SealFile(request).then(
      (file) => ({ file }),
      (error) => ({ error }),
    );
    if (outcome.error) {
      assert.equal(outcome.error.code, "GENERATION_MISMATCH");
      assert.equal(await fixture.exists(request.destinationKey), false);
      return;
    }
    assert.equal(await fixture.read(request.destinationKey), ORIGINAL_BYTES);
    assert.equal(outcome.file.metadata.size, Buffer.byteLength(ORIGINAL_BYTES));
  });
}

function registerStorageMismatchTest(factory) {
  test("backing-store mismatch fails before destination publication", async (t) => {
    const { fixture, request } = await prepare(factory, t);
    const changed = {
      ...request,
      source: { ...request.source, storageId: "other-store" },
    };
    await assert.rejects(fixture.api.SealFile(changed), {
      code: "STORAGE_MISMATCH",
    });
    assert.equal(await fixture.exists(request.destinationKey), false);
  });
}

function registerRemovalTests(factory) {
  for (const shouldSeal of [false, true]) {
    test(`terminal removal survives restart; initially sealed=${shouldSeal}`, async (t) => {
      const { fixture, request } = await prepare(factory, t);
      assert.deepEqual(await fixture.api.GetFileSeal(request), {
        status: "absent",
      });
      if (shouldSeal) await fixture.api.SealFile(request);
      assert.deepEqual(await fixture.api.RemoveSealedFile(request), {
        status: "removed",
      });
      await fixture.restart();
      assert.deepEqual(await fixture.api.GetFileSeal(request), {
        status: "removed",
      });
      assert.deepEqual(await fixture.api.RemoveSealedFile(request), {
        status: "removed",
      });
      await assert.rejects(fixture.api.SealFile(request), {
        code: "ADMISSION_REMOVED",
      });
      assert.equal(await fixture.exists(request.destinationKey), false);
    });
  }
}

function registerAdmissionReuseTest(factory) {
  test("terminal admission cannot be reused with a changed destination or generation", async (t) => {
    const { fixture, request } = await prepare(factory, t);
    await fixture.api.RemoveSealedFile(request);
    const changedRequests = [
      { ...request, destinationKey: "__sealed__/other" },
      {
        ...request,
        source: { ...request.source, generation: "other-generation" },
      },
    ];
    for (const changed of changedRequests) {
      for (const operation of ["SealFile", "GetFileSeal", "RemoveSealedFile"]) {
        await assert.rejects(fixture.api[operation](changed), {
          code: "DESTINATION_CONFLICT",
        });
      }
    }
  });
}
