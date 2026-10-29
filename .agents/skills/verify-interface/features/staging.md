---
covers:
  - src/index.ts
docs:
  - docs/2.file-operations.md
  - docs/3.provider-contract.md
journeys:
  - staging-calls
  - staging-keys
---

# Staging

An upload with `staging: true` lands under the reserved prefix `__staging__/`. The server confirms it with `PromoteFile` (the final key, no overwrite) or relocates any object with `MoveFile`. `STAGING_PREFIX`, `isStagedKey`, `toStagedKey` and `stripStagingPrefix` are string helpers that never touch storage.

## Sub-features

- `staging-calls`: `PromoteFile` and `MoveFile` reach the provider's `internal` proxies with their keys and the storage id.
- `staging-keys`: the helpers on the packed `dist/index.js` do what the table in `docs/2.file-operations.md` says: the prefix is added once, removed once, and a non-staged key is left unchanged.

## How to get to it (user POV)

- `const { resourceKey } = await PromoteFile(stagedKey)` after the user confirms a form; `toStagedKey("avatars/photo.png")` to compute a staging key.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" staging
```

## Gotchas

- The idempotence and `FileConflictError` behaviours of `PromoteFile` belong to the provider and are checked by its conformance tests (`docs/3.provider-contract.md`), not here.
