import { randomUUID } from "node:crypto";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";

const service = new ObjectStorageService();

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  let p = path;
  if (!p.startsWith("/")) p = `/${p}`;
  const parts = p.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

/**
 * Server-side upload of a raw buffer into the private object dir.
 * Returns a normalized object path (`/objects/uploads/<id>`) suitable for
 * storing in the database and serving via `GET /api/storage/objects/...`.
 */
export async function uploadBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  let dir = service.getPrivateObjectDir();
  if (!dir.endsWith("/")) dir = `${dir}/`;
  const id = randomUUID();
  const fullPath = `${dir}uploads/${id}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);
  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(buffer, { contentType, resumable: false });
  return `/objects/uploads/${id}`;
}

/** Download an object (path starting with `/objects/`) back into memory. */
export async function downloadObjectToBuffer(
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const file = await service.getObjectEntityFile(objectPath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  return {
    buffer,
    contentType: (metadata.contentType as string) || "application/octet-stream",
  };
}
