import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { objectStorageClient, ObjectStorageService, isLocal, LOCAL_STORAGE_DIR } from "./objectStorage";

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
  if (isLocal) {
    const id = randomUUID();
    const filePath = path.join(LOCAL_STORAGE_DIR, id);
    await fs.promises.writeFile(filePath, buffer);
    await fs.promises.writeFile(`${filePath}.meta`, JSON.stringify({ contentType }));
    return `/objects/uploads/${id}`;
  }

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
  if (isLocal) {
    const id = objectPath.replace(/^\/objects\/uploads\//, "");
    const filePath = path.join(LOCAL_STORAGE_DIR, id);
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found locally in storage");
    }
    const buffer = await fs.promises.readFile(filePath);
    let contentType = "application/octet-stream";
    if (fs.existsSync(`${filePath}.meta`)) {
      const meta = JSON.parse(await fs.promises.readFile(`${filePath}.meta`, "utf-8"));
      contentType = meta.contentType;
    }
    return { buffer, contentType };
  }

  const file = await service.getObjectEntityFile(objectPath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  return {
    buffer,
    contentType: (metadata.contentType as string) || "application/octet-stream",
  };
}
