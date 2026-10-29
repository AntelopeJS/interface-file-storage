---
covers:
  - src/index.ts
docs:
  - docs/2.file-operations.md
journeys:
  - staged-key-prefix
---

# Staged key prefix

The reserved prefix is `__staging__/`, with its slash. `__staging__` alone and `__staging__x/...` are not staged keys; `__staging__/` is, and stripping it leaves the empty key.

## Sub-features

- `staged-key-prefix`: the helpers on the packed `dist/index.js` answer for the bare word, a lookalike and the bare prefix as the docs say. A prefix test without the trailing slash would classify a lookalike as staged and strip twelve characters of a permanent key.

## How to get to it (user POV)

- `stripStagingPrefix(key)` to compute a final key; `toStagedKey(key)` for a staging key.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" staged-key-prefix
```

## Gotchas

- String helpers only: no provider is involved.
