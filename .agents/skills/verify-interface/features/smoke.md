---
covers:
docs:
  - docs/1.introduction.md
journeys:
  - every-wrapper
---

# Smoke

The fixed journey every verdict runs, whatever the diff touches: pack the interface, load it in `ajs project dev` with a stub provider and a consumer, and call all nine storage functions through core.

## Sub-features

- `every-wrapper`: `CreateUploadUrl`, `WriteFile`, `CreateReadUrl`, `ReadFile`, `DeleteFile`, `FileExists`, `GetFileMetadata`, `MoveFile` and `PromoteFile` each reach their `internal` proxy at the stub provider with every argument. This stands in for the pack's `every-function` journey, which cannot read this package's declarations (see the repository's pull request).

## How to get to it (user POV)

- A project with a file-storage provider and a module that imports `@antelopejs/interface-file-storage`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" smoke
```

## Gotchas

- The smoke feature covers no glob, so it never marks a file as mapped.
