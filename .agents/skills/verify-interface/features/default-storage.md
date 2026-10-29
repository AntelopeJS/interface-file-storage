---
covers:
  - src/index.ts
docs:
  - docs/1.introduction.md
journeys:
  - omitted-storage
---

# Default storage

Every storage function takes an optional `storage` id as its last argument. Left out, the interface forwards none and the provider picks its default storage (`docs/1.introduction.md`, "Multi-Bucket Support").

## Sub-features

- `omitted-storage`: each of the nine functions is called through core without a storage id; the stub provider must receive the other arguments and no storage id. An interface that fills in its own default (`storage ?? "default"`) would route every omitted call to a bucket the project did not choose.

## How to get to it (user POV)

- `await FileExists("avatars/photo.png")` in a project with one or more storages configured.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" default-storage
```

## Gotchas

- JSON shows the absent argument the provider receives as `null`.
