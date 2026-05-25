import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { randomUUID } from "node:crypto";

let svc: BlobServiceClient | null = null;
function service() {
  const conn = process.env.BLOB_CONNECTION_STRING;
  if (!conn) return null;
  if (!svc) svc = BlobServiceClient.fromConnectionString(conn);
  return svc;
}

export async function uploadBuffer(opts: {
  container: string;
  filename: string;
  data: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const s = service();
  const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${opts.filename}`;
  if (!s) {
    // Dev fallback: write to /tmp so the rest of the system can verify upload paths.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join("/tmp", "ats-blob", opts.container);
    await fs.mkdir(dir, { recursive: true });
    const full = path.join(dir, key.replace(/\//g, "_"));
    await fs.writeFile(full, opts.data);
    return { url: `file://${full}`, key };
  }
  const container = s.getContainerClient(opts.container);
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(key);
  await blob.upload(opts.data, opts.data.byteLength, {
    blobHTTPHeaders: { blobContentType: opts.contentType },
  });
  return { url: blob.url, key };
}

export async function signedReadUrl(container: string, key: string, ttlMinutes = 15): Promise<string> {
  const s = service();
  if (!s) {
    // Local dev: return file:// URL as-is.
    return `file:///tmp/ats-blob/${container}/${key.replace(/\//g, "_")}`;
  }
  const conn = process.env.BLOB_CONNECTION_STRING!;
  const account = /AccountName=([^;]+)/.exec(conn)?.[1];
  const accountKey = /AccountKey=([^;]+)/.exec(conn)?.[1];
  if (!account || !accountKey) return s.getContainerClient(container).getBlobClient(key).url;
  const cred = new StorageSharedKeyCredential(account, accountKey);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container,
      blobName: key,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
    cred,
  ).toString();
  return `${s.getContainerClient(container).getBlobClient(key).url}?${sas}`;
}
