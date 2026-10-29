---
covers:
  - src/index.ts
docs:
  - docs/2.file-operations.md
journeys:
  - staged-key-position
---

# Staged key position

The staging prefix `__staging__/` marks a key only at its start. A key that merely contains the prefix further in is an ordinary key: `isStagedKey` is false, `stripStagingPrefix` leaves it unchanged and `toStagedKey` prefixes it.

## Sub-features

- `staged-key-position`: the helpers on the packed `dist/index.js` answer for `avatars/__staging__/photo.png` as the table in `docs/2.file-operations.md` says ("Tests whether the key begins with the prefix"). A containment test instead of a start test would treat the key as staged, so a promotion or sweep would strip or skip part of a permanent key.

## How to get to it (user POV)

- `isStagedKey(key)` before `PromoteFile`, on keys users can influence through `path`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" staged-key-position
```

## Gotchas

- String helpers only: no provider is involved.
