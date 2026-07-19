---
name: file-storage-interface
description: Provider-agnostic AntelopeJS file storage with presigned upload/download URLs, staged uploads with promotion, metadata, existence checks, and multi-bucket support. Use when code imports "@antelopejs/interface-file-storage", when an AntelopeJS module handles file uploads, downloads, avatars, or attachments, or when you encounter CreateUploadUrl, CreateReadUrl, PromoteFile, MoveFile, DeleteFile, FileExists, GetFileMetadata, STAGING_PREFIX, UploadRequest, or PresignedUploadResponse.
category: antelopejs-interface
tags: [file-storage, presigned-url, upload, s3, antelopejs]
---

# file-storage interface

Presigned-URL file storage: clients PUT/GET file bytes directly against the storage backend (S3, GCS, local, ...); your module only mints URLs and manages keys. The PascalCase functions (`CreateUploadUrl`, `MoveFile`, ...) are thin wrappers over `internal.*` proxy points, so every call is async and queues until a provider module attaches. `PromoteFile` and the staging-key helpers (`isStagedKey`, `toStagedKey`, `stripStagingPrefix`) are consumer-side logic built in this package on the `moveFile`/`fileExists` primitives.

## Imports

Single root export — add `@antelopejs/interface-file-storage` to the module's `dependencies`:

```ts
import {
  CreateUploadUrl, CreateReadUrl, DeleteFile, FileExists,
  GetFileMetadata, MoveFile, PromoteFile,
  STAGING_PREFIX, isStagedKey, toStagedKey, stripStagingPrefix,
  UploadValidationError, FileNotFoundError,
} from "@antelopejs/interface-file-storage";
import type {
  UploadRequest, UploadConstraints, PresignedUploadResponse,
  PresignedReadResponse, PromoteFileResponse, FileMetadata, Visibility,
} from "@antelopejs/interface-file-storage";
```

## Consuming: staged upload flow

```ts
const { uploadUrl, resourceKey, headers } = await CreateUploadUrl(
  { filename: "avatar.png", size, mimetype: "image/png", path: "avatars", staging: true },
  { maxSize: 5 * 1024 * 1024, allowedMimetypes: ["image/png", "image/jpeg"] },
);
// Client PUTs the file bytes to uploadUrl, sending `headers` unmodified.
// Once the client confirms, move the file out of the auto-expiring staging area:
const { resourceKey: finalKey } = await PromoteFile(resourceKey);
const { url } = await CreateReadUrl(finalKey, 3600);
```

Omit `staging` for a direct, permanent upload (no promotion step needed).

## Providing a backend

A storage backend module declares `"antelopeJs": { "implements": ["@antelopejs/interface-file-storage"] }` in its `package.json` and attaches implementations onto the `internal` namespace only:

```ts
import { ImplementInterface } from "@antelopejs/interface-core";
import { internal } from "@antelopejs/interface-file-storage";

ImplementInterface(internal, {
  createUploadUrl: async (request, constraints, storage) => ({ /* ... */ }),
  createReadUrl: /* ... */, deleteFile: /* ... */, fileExists: /* ... */,
  getFileMetadata: /* ... */,
  moveFile: /* ... */, // MUST no-op on a missing source (idempotent)
});
```

Do not implement `PromoteFile` in a backend — the promotion/idempotency contract is enforced once in this package on top of `moveFile` + `fileExists`.

## Gotchas

- The upload URL signs `Content-Type` and `Content-Length`: the client PUT must send the returned `headers` and the exact declared size/mimetype, or the signature is rejected.
- Every function is async and queues until a provider attaches — always `await`; never treat results as synchronous values at module-load time.
- `CreateUploadUrl` throws `UploadValidationError` (`code` is `"SIZE_EXCEEDED"` or `"MIMETYPE_NOT_ALLOWED"`) when constraints are violated; `GetFileMetadata` throws `FileNotFoundError` for missing keys.
- Staged files live under `STAGING_PREFIX` (`"__staging__/"`) so backends can auto-expire abandoned uploads; anything you intend to keep must be promoted. `PromoteFile` is safe to call twice, but throws `FileNotFoundError` if the staged object expired before promotion.
- Visibility (`"public"` | `"private"`) comes from the storage configuration, not per-call parameters: public files return a permanent `url` with `expiresAt` undefined; private files return a presigned URL plus `expiresAt`.
- The optional trailing `storage` parameter on every function selects a bucket/backend in multi-storage setups; omit it for the default storage.

## Deeper reference

Exact signatures and TSDoc live in the shipped `dist/index.d.ts`. This package's `docs/` covers the rest in two chapters — *Introduction* (concepts, visibility, error classes) and *File Operations* (full upload flow, staging and promotion, request/response tables). Do not guess beyond them.
