/**
 * Prepares the document bucket: creates it if missing and sets CORS so browsers on this site (and
 * only this site) may upload with the signed URLs. Works the same on Cloudflare R2 and SeaweedFS.
 *
 *   pnpm storage:setup            # uses S3_* and BETTER_AUTH_URL from the environment / .env
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { z } from "zod";

const e = z
  .object({
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().min(3),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
  })
  .parse(process.env);

const aws = new AwsClient({ accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY, service: "s3", region: e.S3_REGION });
const bucketUrl = `${e.S3_ENDPOINT.replace(/\/+$/, "")}/${e.S3_BUCKET}`;
const origin = new URL(e.BETTER_AUTH_URL).origin;

/** Storage that was just started may need a few seconds before it accepts connections. */
async function headBucket(): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await aws.fetch(bucketUrl, { method: "HEAD" });
    } catch (error) {
      if (attempt >= 30) throw new Error(`Storage at ${e.S3_ENDPOINT} is not reachable: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  const head = await headBucket();
  if (head.status === 404) {
    const created = await aws.fetch(bucketUrl, { method: "PUT" });
    if (!created.ok) throw new Error(`Could not create bucket (HTTP ${created.status}): ${await created.text()}`);
    console.log(`Created bucket ${e.S3_BUCKET}.`);
  } else if (!head.ok) {
    throw new Error(`Could not reach bucket (HTTP ${head.status}). Check S3_ENDPOINT and the keys.`);
  }

  const cors = `<CORSConfiguration><CORSRule><AllowedOrigin>${origin}</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedHeader>content-type</AllowedHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule></CORSConfiguration>`;
  const response = await aws.fetch(`${bucketUrl}?cors`, {
    method: "PUT",
    body: cors,
    headers: { "Content-Type": "application/xml", "Content-MD5": createHash("md5").update(cors).digest("base64") },
  });
  if (!response.ok) throw new Error(`Could not set CORS (HTTP ${response.status}): ${await response.text()}`);
  console.log(`Bucket ${e.S3_BUCKET} ready; uploads allowed from ${origin}.`);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
