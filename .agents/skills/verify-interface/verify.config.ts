import { equal, interrupted } from "@antelopejs/tooling-configs/verify";
import type { CallRequest, Journey, JourneyContext, VerifyConfig } from "@antelopejs/tooling-configs/verify";

/** A consumer call of one exported function, and the `internal` proxy the stub provider must receive it on. */
interface Wrapper {
  name: string;
  proxy: string;
  args: NonNullable<CallRequest["args"]>;
}

const UPLOAD = { filename: "photo.png", size: 2048, mimetype: "image/png", path: "avatars", staging: true };
const CONSTRAINTS = { maxSize: 4096, allowedMimetypes: ["image/png"] };

const WRAPPERS = {
  CreateUploadUrl: { name: "CreateUploadUrl", proxy: "createUploadUrl", args: [UPLOAD, CONSTRAINTS, "media"] },
  WriteFile: { name: "WriteFile", proxy: "writeFile", args: [UPLOAD, [104, 105], CONSTRAINTS, "media"] },
  CreateReadUrl: { name: "CreateReadUrl", proxy: "createReadUrl", args: ["avatars/photo.png", 60, "media"] },
  ReadFile: { name: "ReadFile", proxy: "readFile", args: ["avatars/photo.png", "media"] },
  DeleteFile: { name: "DeleteFile", proxy: "deleteFile", args: ["avatars/photo.png", "media"] },
  FileExists: { name: "FileExists", proxy: "fileExists", args: ["avatars/photo.png", "media"] },
  GetFileMetadata: { name: "GetFileMetadata", proxy: "getFileMetadata", args: ["avatars/photo.png", "media"] },
  MoveFile: { name: "MoveFile", proxy: "moveFile", args: ["avatars/draft.png", "avatars/photo.png", "media"] },
  PromoteFile: { name: "PromoteFile", proxy: "promoteFile", args: ["__staging__/avatars/photo.png", "media"] },
} satisfies { [name: string]: Wrapper };

/** What a packed-interface script prints, as the JSON the journey compares it with. */
interface Printed {
  [key: string]: string | boolean | string[];
}

/** Loads the packed interface next to a stub provider and calls each exported function through core: it must reach its `internal` proxy with every argument, the storage id included. With `omitStorage` the consumer leaves the storage id out and the provider must receive none (JSON shows an absent argument as null), so the provider, not this interface, picks the default storage. */
function throughCore(title: string, wrappers: Wrapper[], omitStorage = false): Journey {
  return {
    title,
    entryPoint: "a consumer module calling the packed interface in `ajs project dev`",
    async run(context) {
      const app = await context.dev("ajs project dev", context.fixture());
      for (const { name, proxy, args: full } of wrappers) {
        const args = omitStorage ? full.slice(0, -1) : full;
        const forwarded = omitStorage ? [...args, null] : args;
        const result = await context.call(`call ${name}`, app, { path: [name], args });
        context.expect(result.folder, [
          { name: `${name} resolved through core`, pass: result.ok, detail: JSON.stringify(result.value) },
          equal(`${name} reached the provider's ${proxy} with its arguments`, result.value, { stub: `.:internal.${proxy}`, args: forwarded }),
        ]);
      }
      const stopped = await context.stop("SIGINT", app);
      context.expect(stopped.folder, [interrupted(stopped)]);
    },
  };
}

/** Runs a script against the packed `dist/index.js` and checks the JSON it prints. */
function packed(title: string, script: string, expected: Printed, label: string): Journey {
  return {
    title,
    entryPoint: "the packed interface required from a consumer",
    async run(context: JourneyContext) {
      const loaded = await context.command(label, "node", [
        "-e",
        `const c = require(process.argv[1]); ${script}`,
        `${context.repo}/dist/index.js`,
      ]);
      context.expect(loaded.folder, [equal(`${label} answers as docs/ states`, loaded.stdout.trim(), JSON.stringify(expected))]);
    },
  };
}

const config: VerifyConfig = {
  doors: {
    data: null,
    format: null,
    contract: {
      globs: ["src/index.ts", "package.json"],
      funnels: [],
      containments: [],
      why: "the nine storage functions, the key helpers and the error classes are what every upload and download flow imports",
    },
    outbound: null,
    exposure: {
      globs: ["src/index.ts"],
      funnels: [],
      containments: [],
      why: "UploadRequest.visibility and CreateReadUrl decide whether a file is public or readable only through an expiring URL",
    },
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
      containments: [],
      why: "the package name and release workflow claim @antelopejs/interface-file-storage on npm",
    },
  },
  journeys: {
    "upload-calls": throughCore("CreateUploadUrl and WriteFile reach the provider", [WRAPPERS.CreateUploadUrl, WRAPPERS.WriteFile]),
    "objects-calls": throughCore("CreateReadUrl, ReadFile, DeleteFile, FileExists and GetFileMetadata reach the provider", [
      WRAPPERS.CreateReadUrl,
      WRAPPERS.ReadFile,
      WRAPPERS.DeleteFile,
      WRAPPERS.FileExists,
      WRAPPERS.GetFileMetadata,
    ]),
    "staging-calls": throughCore("PromoteFile and MoveFile reach the provider", [WRAPPERS.PromoteFile, WRAPPERS.MoveFile]),
    "every-wrapper": throughCore("all nine storage functions reach the provider", Object.values(WRAPPERS)),
    "omitted-storage": throughCore(
      "a call without a storage id reaches the provider without one",
      Object.values(WRAPPERS),
      true,
    ),
    "staged-key-position": packed(
      "the staging prefix counts only at the start of a key",
      'console.log(JSON.stringify({ inside: c.isStagedKey("avatars/__staging__/photo.png"), stripped: c.stripStagingPrefix("avatars/__staging__/photo.png"), staged: c.toStagedKey("avatars/__staging__/photo.png") }))',
      { inside: false, stripped: "avatars/__staging__/photo.png", staged: "__staging__/avatars/__staging__/photo.png" },
      "prefix inside a key",
    ),
    "staged-key-prefix": packed(
      "the staging prefix is the whole reserved string, trailing slash included",
      'console.log(JSON.stringify({ bare: c.isStagedKey("__staging__"), near: c.isStagedKey("__staging__x/photo.png"), empty: c.isStagedKey("__staging__/"), stripBare: c.stripStagingPrefix("__staging__"), stripEmpty: c.stripStagingPrefix("__staging__/"), stagedNear: c.toStagedKey("__staging__x/photo.png") }))',
      { bare: false, near: false, empty: true, stripBare: "__staging__", stripEmpty: "", stagedNear: "__staging__/__staging__x/photo.png" },
      "prefix lookalikes",
    ),
    "staging-keys": packed(
      "the staging key helpers behave as docs/2.file-operations.md states",
      'console.log(JSON.stringify({ prefix: c.STAGING_PREFIX, staged: c.toStagedKey("avatars/photo.png"), again: c.toStagedKey("__staging__/avatars/photo.png"), isStaged: c.isStagedKey("__staging__/a"), isPlain: c.isStagedKey("a"), strip: c.stripStagingPrefix("__staging__/avatars/photo.png"), stripPlain: c.stripStagingPrefix("avatars/photo.png"), stripOnce: c.stripStagingPrefix("__staging__/__staging__/x") }))',
      {
        prefix: "__staging__/",
        staged: "__staging__/avatars/photo.png",
        again: "__staging__/avatars/photo.png",
        isStaged: true,
        isPlain: false,
        strip: "avatars/photo.png",
        stripPlain: "avatars/photo.png",
        stripOnce: "__staging__/x",
      },
      "staging key helpers",
    ),
    "upload-errors": packed(
      "UploadValidationError carries the codes docs/1.introduction.md lists",
      'const e = new c.UploadValidationError("too big", "SIZE_EXCEEDED"); console.log(JSON.stringify({ name: e.name, code: e.code, message: e.message, error: e instanceof Error }))',
      { name: "UploadValidationError", code: "SIZE_EXCEEDED", message: "too big", error: true },
      "UploadValidationError",
    ),
    "objects-errors": packed(
      "FileNotFoundError and FileConflictError carry the message and code docs/1.introduction.md states",
      'const n = new c.FileNotFoundError("uploads/missing-file.txt"); const f = new c.FileConflictError("a/b"); console.log(JSON.stringify({ notFound: [n.name, n.message], conflict: [f.name, f.code, f.message] }))',
      {
        notFound: ["FileNotFoundError", "File not found: uploads/missing-file.txt"],
        conflict: ["FileConflictError", "FILE_CONFLICT", "File conflict: a/b"],
      },
      "file errors",
    ),
  },
};

export default config;
