---
covers:
  - src/index.ts
docs:
  - docs/1.introduction.md
  - docs/2.file-operations.md
journeys:
  - objects-calls
  - objects-errors
---

# Objects

A server hands out a read URL (`CreateReadUrl`, with an expiry for private files), reads bytes (`ReadFile`), checks existence (`FileExists`), describes a file (`GetFileMetadata`) or removes it (`DeleteFile`). A missing file throws `FileNotFoundError` and a contested promotion destination `FileConflictError` (`FILE_CONFLICT`).

## Sub-features

- `objects-calls`: the five functions reach the provider's `internal` proxies with the key, the expiry where there is one, and the storage id.
- `objects-errors`: `FileNotFoundError` carries `File not found: <key>`, `FileConflictError` carries the code `FILE_CONFLICT`, both from the packed `dist/index.js`.

## How to get to it (user POV)

- `await CreateReadUrl("uploads/logo.png", 3600)` for a download link; `await GetFileMetadata(key)` before showing a file.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" objects
```

## Gotchas

- The stub answers every call with an echo, so the journeys prove routing and argument order, not what a real backend returns for a missing key.
