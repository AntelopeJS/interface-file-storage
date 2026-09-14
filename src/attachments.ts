import { InterfaceFunction } from "@antelopejs/interface-core";

import type {
  FileMetadata,
  PresignedReadResponse,
  PresignedUploadResponse,
  UploadConstraints,
  UploadRequest,
} from "./index";

/** @internal */
export namespace internal {
  export const createPrivateUploadUrl =
    InterfaceFunction<
      (
        request: UploadRequest,
        constraints?: UploadConstraints,
        storage?: string,
      ) => Promise<PresignedUploadResponse>
    >();
  export const prepareAttachment =
    InterfaceFunction<
      (
        sourceKey: string,
        destinationKey: string,
        storage?: string,
      ) => Promise<void>
    >();
  export const publishAttachment =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<PresignedReadResponse>
    >();
  export const getPrivateFileMetadata =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<FileMetadata>
    >();
  export const createPrivateReadUrl =
    InterfaceFunction<
      (
        resourceKey: string,
        expiresIn: number,
        storage?: string,
      ) => Promise<PresignedReadResponse>
    >();
  export const deleteAttachment =
    InterfaceFunction<
      (resourceKey: string, storage?: string) => Promise<void>
    >();
}

/** Creates a temporary private attachment upload URL. */
export function CreatePrivateUploadUrl(
  request: UploadRequest,
  constraints?: UploadConstraints,
  storage?: string,
): Promise<PresignedUploadResponse> {
  return internal.createPrivateUploadUrl(request, constraints, storage);
}

/** Creates an immutable private attachment snapshot. */
export function PrepareAttachment(
  sourceKey: string,
  destinationKey: string,
  storage?: string,
): Promise<void> {
  return internal.prepareAttachment(sourceKey, destinationKey, storage);
}

/** Publishes an immutable copy and returns its stable public URL. */
export function PublishAttachment(
  resourceKey: string,
  storage?: string,
): Promise<PresignedReadResponse> {
  return internal.publishAttachment(resourceKey, storage);
}

/** Returns metadata for a private attachment snapshot. */
export function GetPrivateFileMetadata(
  resourceKey: string,
  storage?: string,
): Promise<FileMetadata> {
  return internal.getPrivateFileMetadata(resourceKey, storage);
}

/** Creates a signed private attachment read URL. */
export function CreatePrivateReadUrl(
  resourceKey: string,
  expiresIn: number,
  storage?: string,
): Promise<PresignedReadResponse> {
  return internal.createPrivateReadUrl(resourceKey, expiresIn, storage);
}

/** Deletes temporary, private, and public attachment copies. */
export function DeleteAttachment(
  resourceKey: string,
  storage?: string,
): Promise<void> {
  return internal.deleteAttachment(resourceKey, storage);
}
