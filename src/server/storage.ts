import "server-only";
import { AwsClient } from "aws4fetch";
import { storageEnv } from "./env";

// S3-compatible API: Cloudflare R2 in production, SeaweedFS locally. Path-style URLs work on both.

let client: AwsClient | undefined;
function aws(): AwsClient {
  const e = storageEnv();
  client ??= new AwsClient({ accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY, service: "s3", region: e.S3_REGION });
  return client;
}

function objectUrl(endpoint: string, key: string): URL {
  const { S3_BUCKET } = storageEnv();
  return new URL(`${endpoint.replace(/\/+$/, "")}/${S3_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`);
}

const serverUrl = (key: string) => objectUrl(storageEnv().S3_ENDPOINT, key);
const publicUrl = (key: string) => {
  const e = storageEnv();
  return objectUrl(e.S3_PUBLIC_ENDPOINT ?? e.S3_ENDPOINT, key);
};

/**
 * A short-lived URL the browser can PUT one file to. Content-Type and Content-Length are part of the
 * signature, so the upload is refused unless the file has exactly the declared type and size.
 */
export async function presignUpload(key: string, contentType: string, sizeBytes: number, expiresSeconds = 300): Promise<string> {
  const url = publicUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await aws().sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType, "Content-Length": String(sizeBytes) } }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signed.url;
}

/** A short-lived URL to view a private file. The bucket itself is never public. */
export async function presignDownload(key: string, fileName: string, expiresSeconds = 60): Promise<string> {
  const url = publicUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const safeName = fileName.replace(/[^\w.\- ]/g, "_");
  url.searchParams.set("response-content-disposition", `inline; filename="${safeName}"`);
  const signed = await aws().sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

/** Size and type of a stored object, or null if it does not exist. */
export async function headObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null> {
  const response = await aws().fetch(serverUrl(key), { method: "HEAD", signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Storage HEAD failed (HTTP ${response.status})`);
  return { sizeBytes: Number(response.headers.get("content-length")), contentType: response.headers.get("content-type") };
}

/** The first `length` bytes of an object, to check what kind of file it really is. */
export async function readObjectStart(key: string, length: number): Promise<Uint8Array> {
  const response = await aws().fetch(serverUrl(key), { headers: { Range: `bytes=0-${length - 1}` }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Storage read failed (HTTP ${response.status})`);
  return new Uint8Array(await response.arrayBuffer()).slice(0, length);
}

/** Deletes an object. Deleting one that is already gone is fine. */
export async function deleteObject(key: string): Promise<void> {
  const response = await aws().fetch(serverUrl(key), { method: "DELETE", signal: AbortSignal.timeout(10_000) });
  if (!response.ok && response.status !== 404) throw new Error(`Storage DELETE failed (HTTP ${response.status})`);
}
