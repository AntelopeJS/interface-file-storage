# Agent guidance

`@antelopejs/interface-file-storage` is an AntelopeJS interface: the contract a file-storage provider implements and a module calls. It has no runtime of its own.

## Layout

- `src/index.ts` is the whole public interface: the functions, the `internal` handlers a provider implements, the error classes, and the staging key helpers.
- `src/tests/file-storage.test.ts` is the shared provider conformance suite. It builds to `dist/tests/file-storage.test.js` and ships in the package. In a provider that lists this package in `antelopeJs.implements`, `ajs module test` runs every `*.test.js` in this package's `dist/tests/`, so any test added under `src/tests/` runs in every provider. `file-storage-s3` and `file-storage-local` also fail early when `dist/tests/file-storage.test.js` is missing. Nothing in this repository imports it, so keep its name and location and do not delete it as dead code.
- `test/promotion.test.js` holds the forwarding unit tests. They run against the built `dist` through `ajs module test .`, configured by `src/antelope.test.ts`.
- `docs/` and `skills/` ship in the npm package. Update them, and the matching `SKILL.md`, when the contract changes.

## Tests

`pnpm test` builds `dist` and runs only the forwarding tests. `pnpm run checks` does not run the conformance suite: it needs a real provider and backend, so it runs in each provider repository against its own storage. Check a contract change there before releasing it.

## Versioning

A new required `internal` handler breaks every provider that lacks it: the provider fails to construct. Providers cap this interface below the next minor, so state the provider versions that implement the change in the upgrade notes and release the providers together with it.

## Releases

The release commit writes `CHANGELOG.md`. Upgrade notes for that version follow in a separate `docs(changelog)` pull request, under `### Upgrade notes`.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

Finish every change with `pnpm run checks`. It runs typecheck, lint, format, knip, tests, size, ratchet, and sync, and prints only what failed. The change is done when it prints no failure.

The tools enforce most rules, listed in the table at the end. The sections below hold the rules no tool checks.

### Comments

Say it in code. A constraint belongs in a type, a lint rule, or a test. A public item's contract belongs in TSDoc (`/** */`) on that item. The only other comments are lint directives that name their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, `/*!` license headers, and bundler or formatter directives.

### Tests

Hold every test you write or keep to this checklist:

- Name the wrong implementation this test fails on. A test with no answer is deleted, not kept.
- No test reads the file it tests. Drive the behaviour through the public interface.
- An invariant over many files is a lint rule, not a test.

### Debt

`guardrails.ratchet.json` records the lint findings and oversize files this repository already had. Its numbers only go down. After you remove debt, run `pnpm run ratchet:update` and commit the lowered file. A rule listed there is off for `oxlint`. The ratchet counts it instead, and the pre-commit hook rejects it on every line you add.

### What enforces what

| Rule                                                                           | Enforced by                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Formatting                                                                     | oxfmt                                     |
| Lint findings are errors; no rule warns                                        | oxlint preset                             |
| Comments are TSDoc, directives, or `SAFETY:` only                              | `antelopejs/no-comments`                  |
| Every test asserts                                                             | `antelopejs/require-assertion`            |
| Tests read no files outside fixtures, helpers, locales                         | `antelopejs/no-fs-read-in-tests`          |
| No assertion that restates a constant                                          | `antelopejs/no-constant-value-assertion`  |
| No test whose only check is "is a function"                                    | `antelopejs/no-typeof-function-only-test` |
| Params ≤ 5, function ≤ 120 lines, file ≤ 500 lines, depth ≤ 4, complexity ≤ 20 | `eslint/max-*`, `eslint/complexity`       |
| Files ≤ 20,000 bytes, tests included                                           | `antelopejs-check-size` (pre-commit)      |
| Existing debt only shrinks                                                     | `antelopejs-ratchet`                      |
| Types check                                                                    | `tsc` (pre-push)                          |
| No dead files, exports, or dependencies                                        | knip                                      |
| Managed files match the pack                                                   | `antelopejs-sync --check`                 |
| A test names the wrong implementation it catches                               | review; no tool                           |

<!-- antelopejs-guardrails:end -->
