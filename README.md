# @antelopejs/interface-file-storage

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/interface-file-storage"><img alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-file-storage?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-file-storage?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/sjK28QHrA7"><img alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a>
<a href="./docs/1.introduction.md"><img alt="Docs" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a>
</div>

The AntelopeJS contract for file storage: clients upload and download files directly with presigned URLs, and your module only signs them and manages the stored objects.

## What it offers

- `CreateUploadUrl` signs a direct upload and checks its size and MIME type against your constraints.
- `CreateReadUrl` returns a permanent URL for a public file and an expiring one for a private file.
- `ReadFile` streams a file's bytes to the server itself, which may not reach the storage's public address.
- `FileExists`, `GetFileMetadata`, `MoveFile` and `DeleteFile` manage stored objects.
- Staged uploads land under a staging prefix until `PromoteFile` confirms them, so abandoned uploads can expire.
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

## Compatibility

<!-- docs-compat: ./package.json#peerDependencies -->

| Package                      | Range            |
| ---------------------------- | ---------------- |
| `@antelopejs/interface-core` | `>=0.2.4 <1.0.0` |

This is the peer requirement in `package.json`. `@antelopejs/core` is a
development/test dependency at `^1.16.0`, not a declared runtime peer. Check the
implementing module's requirements too.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm lint
pnpm test
```

## License

[Apache-2.0](./LICENSE)
