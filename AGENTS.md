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

CI runs `pnpm run checks` in full on every pull request and reports what failed. The commit hook formats and lints the staged files. Locally, run only the fast check for what you touched:

- `pnpm run typecheck` after you change types or signatures.
- `pnpm exec oxlint <files>` and `pnpm exec oxfmt <files>` on the files you changed.
- One test file, not the suite. In a module that tests with `ajs module test`: `pnpm run build`, then `pnpm exec ajs module test . -f dist/<path>.test.js`.

Prove a change works with the verification skill in [`.agents/skills/verify-interface/SKILL.md`](.agents/skills/verify-interface/SKILL.md) before you call it done.

### Comments

Say it in code: a constraint in a type, a lint rule or a test, a public item's contract in TSDoc. Other comments are lint directives naming their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, and license or tool directives. A reason states what the code does now.

### Tests

Each test names the wrong implementation it fails on, or is deleted. Drive behaviour through the public interface. An invariant over many files is a lint rule.

### Review

No tool checks these:

- A type guard checks the nested elements and values it claims.
- A no-upward import rule rejects same-tier peers; probe it with an import.
- A finding only an evasion or a patched internal can trigger goes under Attention and never blocks.

### Suppressions

`guardrails.suppressions.json` caps lint directives, `@ts-expect-error`, `SAFETY:` comments and rules a lint config turns off. Over a cap, fix the code or remove another suppression of that kind; only the operator raises a number. After removing suppressions, run `pnpm run suppressions:update` and commit the file.

<!-- antelopejs-guardrails:end -->
