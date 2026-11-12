<a href="https://github.com/AntelopeJS/antelopejs"><img data-illustration src="./.github/readme/strip.svg" width="100%" alt="INTERFACE · FILE STORAGE: part of AntelopeJS, hexagonal architecture beyond your own code. A glowing button reads Star AntelopeJS."></a>

<div align="center">

# `@antelopejs/interface-file-storage`

<a href="https://www.npmjs.com/package/@antelopejs/interface-file-storage"><img data-illustration alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-file-storage?style=for-the-badge&labelColor=000000&color=000000"></a> <a href="./LICENSE"><img data-illustration alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-file-storage?style=for-the-badge&labelColor=000000&color=000000"></a> <a href="https://discord.gg/g4pFt6eXqu"><img data-illustration alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a> <a href="./docs/1.introduction.md"><img data-illustration alt="Documentation" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a> <a href="https://github.com/AntelopeJS/antelopejs"><img data-illustration alt="Star AntelopeJS" src="https://img.shields.io/github/stars/AntelopeJS/antelopejs?label=Star%20AntelopeJS&style=for-the-badge&labelColor=000000&color=000000&logo=github"></a>

**The AntelopeJS contract for file storage. Upload and download with presigned URLs and metadata, without naming a provider.**

[Documentation](./docs/1.introduction.md) · [Implementations](#implementations) · [All interfaces and providers](https://github.com/AntelopeJS/antelopejs#ecosystem)

</div>

The AntelopeJS contract for file storage. Clients upload and download files directly with presigned URLs, and your module signs the URLs and manages the stored objects.

## What it offers

- `CreateUploadUrl` signs a direct upload and checks its size and MIME type against your constraints.
- `CreateReadUrl` returns a permanent URL for a public file and an expiring one for a private file.
- `WriteFile` stores bytes the server already holds, without a presigned URL.
- `ReadFile` streams a file's bytes to the server itself, which may not reach the storage's public address.
- `FileExists`, `GetFileMetadata`, `MoveFile` and `DeleteFile` manage stored objects.
- Staged uploads stay under a staging prefix until `PromoteFile` confirms them, so abandoned uploads can expire.
- An optional storage name on each storage operation selects one of several buckets.
- [Key helpers](./docs/2.file-operations.md#staging-key-helpers) inspect or transform staging keys without accessing storage.

## Implementations

| Module                                                                               | Notes                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`@antelopejs/file-storage-s3`](https://github.com/AntelopeJS/file-storage-s3)       | S3-compatible object storage (AWS S3, Cloudflare R2)              |
| [`@antelopejs/file-storage-local`](https://github.com/AntelopeJS/file-storage-local) | Local filesystem, for development and single-instance deployments |

## Install

Add the interface to the module that handles files:

```bash
pnpm add @antelopejs/interface-file-storage
```

Then add an implementation to the project:

```bash
ajs project modules add @antelopejs/file-storage-s3
```

## Quick start

```ts
import {
  CreateReadUrl,
  CreateUploadUrl,
} from "@antelopejs/interface-file-storage";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function prepareAvatarUpload(size: number) {
  const { uploadUrl, headers, resourceKey } = await CreateUploadUrl(
    { filename: "avatar.png", size, mimetype: "image/png", path: "avatars" },
    { maxSize: MAX_AVATAR_BYTES, allowedMimetypes: ["image/png"] },
  );
  return { uploadUrl, headers, resourceKey };
}

export async function avatarUrl(resourceKey: string) {
  const { url } = await CreateReadUrl(resourceKey, 3600);
  return url;
}
```

The client sends the file with a `PUT` to `uploadUrl`, including `headers`. Keep `resourceKey` to read, move or delete the file later.

## Documentation

- [Introduction](./docs/1.introduction.md)
- [File operations](./docs/2.file-operations.md)
- [Provider promotion contract](./docs/3.provider-contract.md)

## Compatibility

<!-- antelopejs-docs-compat:start -->

| Package                      | Supported        | Tested with |
| ---------------------------- | ---------------- | ----------- |
| `@antelopejs/interface-core` | `>=0.2.4 <1.0.0` | `0.4.0`     |

<!-- antelopejs-docs-compat:end -->

The table lists the peer dependencies from `package.json`. `@antelopejs/core` is a development dependency, not a peer. Check the requirements of the implementing module too.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm lint
pnpm test
```

## Part of AntelopeJS

This package belongs to [AntelopeJS](https://github.com/AntelopeJS/antelopejs), the TypeScript framework where modules depend on contracts and the application chooses the provider. The open-source back office [AntelopeJS DMS](https://github.com/AntelopeJS/dms) is built on it.

<!-- antelopejs-framework-modules:start -->

| Area         | Contracts                                                                                                                                                                                                                                                                                                                                                                                                                  | Providers                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API          | [`interface-api`](https://github.com/AntelopeJS/interface-api) · [`interface-api-util`](https://github.com/AntelopeJS/interface-api-util) · [`interface-data-api`](https://github.com/AntelopeJS/interface-data-api)                                                                                                                                                                                                       | [`api`](https://github.com/AntelopeJS/api)                                                                                                                                                                                                          |
| Auth         | [`interface-auth`](https://github.com/AntelopeJS/interface-auth)                                                                                                                                                                                                                                                                                                                                                           | [`auth-jwt`](https://github.com/AntelopeJS/auth-jwt)                                                                                                                                                                                                |
| Database     | [`interface-database`](https://github.com/AntelopeJS/interface-database) · [`interface-database-decorators`](https://github.com/AntelopeJS/interface-database-decorators) · [`interface-database-catalog`](https://github.com/AntelopeJS/interface-database-catalog) · [`interface-mongodb`](https://github.com/AntelopeJS/interface-mongodb) · [`interface-rethinkdb`](https://github.com/AntelopeJS/interface-rethinkdb) | [`postgres`](https://github.com/AntelopeJS/postgres) · [`mongodb`](https://github.com/AntelopeJS/mongodb) · [`rethinkdb`](https://github.com/AntelopeJS/rethinkdb)                                                                                  |
| Redis        | [`interface-redis`](https://github.com/AntelopeJS/interface-redis) · [`interface-redis-scheduler`](https://github.com/AntelopeJS/interface-redis-scheduler)                                                                                                                                                                                                                                                                | [`redis`](https://github.com/AntelopeJS/redis)                                                                                                                                                                                                      |
| Email        | [`interface-email`](https://github.com/AntelopeJS/interface-email)                                                                                                                                                                                                                                                                                                                                                         | [`nodemailer`](https://github.com/AntelopeJS/nodemailer) · [`brevo`](https://github.com/AntelopeJS/brevo)                                                                                                                                           |
| File storage | **`interface-file-storage`**                                                                                                                                                                                                                                                                                                                                                                                               | [`file-storage-local`](https://github.com/AntelopeJS/file-storage-local) · [`file-storage-s3`](https://github.com/AntelopeJS/file-storage-s3)                                                                                                       |
| Payments     | [`interface-payment`](https://github.com/AntelopeJS/interface-payment) · [`interface-subscriptions`](https://github.com/AntelopeJS/interface-subscriptions) · [`interface-stripe`](https://github.com/AntelopeJS/interface-stripe)                                                                                                                                                                                         | [`stripe`](https://github.com/AntelopeJS/stripe) · [`mollie`](https://github.com/AntelopeJS/mollie) · [`checkout-com`](https://github.com/AntelopeJS/checkout-com) · [`payment-subscriptions`](https://github.com/AntelopeJS/payment-subscriptions) |

<!-- antelopejs-framework-modules:end -->

## License

[Apache-2.0](./LICENSE)
