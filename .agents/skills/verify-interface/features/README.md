# Feature map

One file per feature. `covers:` lists the source globs it owns, `docs:` the pages a verdict judges, `journeys:` the journeys it runs, and `seeded-breaks/<feature>.patch` the break its journeys must catch. `pnpm exec antelopejs-verify map` checks that every user-facing file is covered.

| Feature | What the user does | Journeys |
|---|---|---|
| [upload](upload.md) | A server asks for a presigned upload URL, or writes a file itself, under size and type constraints. | upload-calls, upload-errors |
| [staging](staging.md) | A server uploads to a staging key, then promotes or moves the object. | staging-calls, staging-keys |
| [objects](objects.md) | A server reads, checks, describes or deletes a stored file, and hands out a read URL. | objects-calls, objects-errors |
| [staged-key-position](staged-key-position.md) | A key that contains the staging prefix further in stays an ordinary key. | staged-key-position |
| [staged-key-prefix](staged-key-prefix.md) | Only the full `__staging__/` prefix marks a staged key. | staged-key-prefix |
| [default-storage](default-storage.md) | A call without a storage id reaches the provider without one. | omitted-storage |
| [smoke](smoke.md) | The fixed journey every verdict runs: load the packed interface with a stub provider and call every storage function. | every-wrapper |
