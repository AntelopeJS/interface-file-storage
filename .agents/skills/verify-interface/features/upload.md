---
covers:
  - src/index.ts
docs:
  - docs/1.introduction.md
  - docs/2.file-operations.md
journeys:
  - upload-calls
  - upload-errors
---

# Upload

A server calls `CreateUploadUrl` for a presigned upload URL (the client then PUTs the bytes to the storage provider), or `WriteFile` to store bytes it already holds. Both take an `UploadRequest`, optional `UploadConstraints` and an optional `storage` id, and throw `UploadValidationError` (`SIZE_EXCEEDED`, `MIMETYPE_NOT_ALLOWED`) when a constraint is violated. Constraints are enforced by the provider.

## Sub-features

- `upload-calls`: the packed interface loads in `ajs project dev` next to a stub provider; `CreateUploadUrl` and `WriteFile` each reach the provider's `internal` proxy with the request, the constraints and the storage id, in order.
- `upload-errors`: `UploadValidationError` from the packed `dist/index.js` is an `Error` with the name, message and `code` the docs describe.

## How to get to it (user POV)

- `await CreateUploadUrl({ filename, size, mimetype, path }, { maxSize })` in a module whose project loads a file-storage provider; `await WriteFile(request, bytes)` for a server-side write.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" upload
```

## Gotchas

- The stub provider never validates constraints; the validation error path is covered by the class journey only, since refusing is the provider's job.
- A call with no provider waits forever; the driver gives up after 15 seconds and the step fails.
