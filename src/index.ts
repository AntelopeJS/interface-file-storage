import { InterfaceFunction } from "@antelopejs/interface-core";

/**
 * Visibility mode for files
 */
export type Visibility = "public" | "private";

/**
 * Request to create an upload URL
 */
export interface UploadRequest {
  /** Original filename */
  filename: string;
  /** Exact file size in bytes */
  size: number;
  /** MIME type of the file (e.g., 'image/jpeg') */
  mimetype: string;
  /** Optional path/folder prefix for the file */
  path?: string;
  /** Optional custom metadata to attach to the file */
  metadata?: Record<string, string>;
  /**
   * When true, the file is uploaded to a reserved staging area (see
   * {@link STAGING_PREFIX}) so that abandoned uploads can be auto-expired by
   * the backend. Confirmed files must later be promoted with {@link PromoteFile}
   * to move them out of staging. Defaults to false (regular, permanent upload).
   */
  staging?: boolean;
}

/**
 * Constraints for validating uploads
 */
export interface UploadConstraints {
  /** Maximum allowed file size in bytes */
  maxSize?: number;
  /** List of allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
  allowedMimetypes?: string[];
}

/**
 * Response containing the presigned upload URL
 */
export interface PresignedUploadResponse {
  /** Presigned PUT URL for direct upload */
  uploadUrl: string;
  /** Unique resource key to reference this file */
  resourceKey: string;
  /** Timestamp when the URL expires */
  expiresAt: number;
  /** Required headers the client must send with the PUT request */
  headers: Record<string, string>;
}

/**
 * Response containing the URL to read/download a file
 */
export interface PresignedReadResponse {
  /** URL to access the file */
  url: string;
  /** Timestamp when the URL expires (undefined if public) */
  expiresAt?: number;
}

/**
 * Response returned after promoting a staged file out of the staging area.
 */
export interface PromoteFileResponse {
  /** Final resource key of the promoted file (staging prefix stripped) */
  resourceKey: string;
}

/**
 * File metadata information
 */
export interface FileMetadata {
  /** Unique resource key */
  resourceKey: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimetype: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Custom metadata attached to the file */
  metadata?: Record<string, string>;
}

/**
 * Error thrown when upload validation fails
 */
export class UploadValidationError extends Error {
  constructor(
    message: string,
    public readonly code: "SIZE_EXCEEDED" | "MIMETYPE_NOT_ALLOWED",
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends Error {
  constructor(resourceKey: string) {
    super(`File not found: ${resourceKey}`);
    this.name = "FileNotFoundError";
  }
}

/**
 * Reserved key prefix for files uploaded to the staging area.
 *
 * Staged files live under this prefix so the backend can auto-expire abandoned
 * uploads (e.g. via an S3 lifecycle rule) while confirmed files are preserved
 * once promoted with {@link PromoteFile}.
 */
export const STAGING_PREFIX = "__staging__/";

/**
 * Checks whether a resource key points to the staging area.
 *
 * @param resourceKey - The resource key to inspect
 * @returns true if the key lives under {@link STAGING_PREFIX}
 */
export function isStagedKey(resourceKey: string): boolean {
  return resourceKey.startsWith(STAGING_PREFIX);
}

/**
 * Returns the staged variant of a resource key.
 *
 * Idempotent: a key already under {@link STAGING_PREFIX} is returned unchanged.
 *
 * @param resourceKey - The base resource key
 * @returns The key prefixed with {@link STAGING_PREFIX}
 */
export function toStagedKey(resourceKey: string): string {
  if (isStagedKey(resourceKey)) {
    return resourceKey;
  }
  return `${STAGING_PREFIX}${resourceKey}`;
}

/**
 * Returns the promoted (final) variant of a resource key by stripping the
 * {@link STAGING_PREFIX}.
 *
 * Idempotent: a key that is not staged is returned unchanged.
 *
 * @param resourceKey - The staged resource key
 * @returns The key with {@link STAGING_PREFIX} removed
 */
export function stripStagingPrefix(resourceKey: string): string {
  if (!isStagedKey(resourceKey)) {
    return resourceKey;
  }
  return resourceKey.slice(STAGING_PREFIX.length);
}

/**
 * @internal
 */
export namespace internal {
  /**
   * Creates a presigned URL for uploading a file.
   * Validates the request against constraints before generating the URL.
   * The generated URL includes signed headers for Content-Type and Content-Length
   * to prevent tampering (SigV4 will reject mismatched values).
   */
  export const createUploadUrl =
    InterfaceFunction<
      (
        request: UploadRequest,
        constraints?: UploadConstraints,
        storage?: string,
      ) => Promise<PresignedUploadResponse>
    >();

  /**
   * Creates a URL to read/download a file.
   * For public files: returns the direct public URL.
   * For private files: returns a presigned GET URL with short expiration.
   */
  export const createReadUrl =
    InterfaceFunction<
      (
        resourceKey: string,
        expiresIn?: number,
        storage?: string,
      ) => Promise<PresignedReadResponse>
    >();

  /**
   * Deletes a file from storage.
   */
  export const deleteFile =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<void>
    >();

  /**
   * Checks if a file exists in storage.
   */
  export const fileExists =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<boolean>
    >();

  /**
   * Retrieves metadata for a file.
   * Throws FileNotFoundError if the file doesn't exist.
   */
  export const getFileMetadata =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<FileMetadata>
    >();

  /**
   * Moves a stored object from one resource key to another within the same
   * storage. Implementations MUST handle a missing source gracefully (no-op) so
   * the operation is idempotent and {@link PromoteFile} is safe to call twice.
   */
  export const moveFile =
    InterfaceFunction<
      (sourceKey: string, destKey: string, storage?: string) => Promise<void>
    >();
}

/**
 * Creates a presigned URL for uploading a file directly to storage.
 *
 * The client must use the returned URL with a PUT request, including
 * all headers specified in the response. Any modification to the
 * Content-Type or Content-Length will cause the signature to be invalid.
 *
 * @param request - Upload request details (filename, size, mimetype)
 * @param constraints - Optional validation constraints
 * @param storage - Optional storage identifier for multi-bucket setups
 * @returns Presigned upload URL and required headers
 * @throws UploadValidationError if constraints are violated
 */
export function CreateUploadUrl(
  request: UploadRequest,
  constraints?: UploadConstraints,
  storage?: string,
): Promise<PresignedUploadResponse> {
  return internal.createUploadUrl(request, constraints, storage);
}

/**
 * Creates a URL to read/download a file.
 *
 * For public files, returns the direct URL (no expiration).
 * For private files, returns a presigned URL with short expiration.
 *
 * @param resourceKey - The unique identifier of the file
 * @param expiresIn - Optional expiration time in seconds (for private files)
 * @param storage - Optional storage identifier for multi-bucket setups
 * @returns URL to access the file
 */
export function CreateReadUrl(
  resourceKey: string,
  expiresIn?: number,
  storage?: string,
): Promise<PresignedReadResponse> {
  return internal.createReadUrl(resourceKey, expiresIn, storage);
}

/**
 * Deletes a file from storage.
 *
 * @param resourceKey - The unique identifier of the file to delete
 * @param storage - Optional storage identifier for multi-bucket setups
 */
export function DeleteFile(
  resourceKey: string,
  storage?: string,
): Promise<void> {
  return internal.deleteFile(resourceKey, storage);
}

/**
 * Checks if a file exists in storage.
 *
 * @param resourceKey - The unique identifier of the file
 * @param storage - Optional storage identifier for multi-bucket setups
 * @returns true if the file exists, false otherwise
 */
export function FileExists(
  resourceKey: string,
  storage?: string,
): Promise<boolean> {
  return internal.fileExists(resourceKey, storage);
}

/**
 * Retrieves metadata for a file.
 *
 * @param resourceKey - The unique identifier of the file
 * @param storage - Optional storage identifier for multi-bucket setups
 * @returns File metadata
 * @throws FileNotFoundError if the file doesn't exist
 */
export function GetFileMetadata(
  resourceKey: string,
  storage?: string,
): Promise<FileMetadata> {
  return internal.getFileMetadata(resourceKey, storage);
}

/**
 * Moves a stored object from one resource key to another within the same storage.
 *
 * The move is performed by the backend (copy + delete on S3, rename on local
 * filesystem). A missing source is handled gracefully, making the call safe to
 * retry.
 *
 * @param sourceKey - The current resource key of the object
 * @param destKey - The target resource key
 * @param storage - Optional storage identifier for multi-bucket setups
 */
export function MoveFile(
  sourceKey: string,
  destKey: string,
  storage?: string,
): Promise<void> {
  return internal.moveFile(sourceKey, destKey, storage);
}

/**
 * Promotes a staged file out of the staging area to its final resource key.
 *
 * Strips the {@link STAGING_PREFIX} from the key and moves the underlying object
 * accordingly via {@link MoveFile}. When the provided key is not staged, the call
 * is a no-op and the key is returned unchanged, so promoting twice is safe
 * (idempotent): the second call sees an already-clean key.
 *
 * The promotion logic lives here, built on the {@link MoveFile} primitive, so the
 * idempotency contract is enforced once for every backend.
 *
 * @param resourceKey - The staged resource key returned by a staging upload
 * @param storage - Optional storage identifier for multi-bucket setups
 * @returns The final resource key after promotion
 * @throws FileNotFoundError if the staged object no longer exists (e.g. it
 *   expired before promotion) and was not already promoted
 */
export async function PromoteFile(
  resourceKey: string,
  storage?: string,
): Promise<PromoteFileResponse> {
  if (!isStagedKey(resourceKey)) {
    return { resourceKey };
  }
  const destKey = stripStagingPrefix(resourceKey);
  await internal.moveFile(resourceKey, destKey, storage);
  if (!(await internal.fileExists(destKey, storage))) {
    throw new FileNotFoundError(resourceKey);
  }
  return { resourceKey: destKey };
}
