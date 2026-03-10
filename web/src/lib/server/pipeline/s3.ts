import fs from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { PipelineConfig } from "./config";

let cachedClient: S3Client | null = null;
let cachedBucket = "";
let cachedRegion = "";

function getClient(config: PipelineConfig): S3Client {
  if (
    cachedClient &&
    cachedBucket === config.aws_s3_bucket &&
    cachedRegion === config.aws_s3_region
  ) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: config.aws_s3_region,
    credentials: {
      accessKeyId: config.aws_access_key_id,
      secretAccessKey: config.aws_secret_access_key,
    },
  });
  cachedBucket = config.aws_s3_bucket;
  cachedRegion = config.aws_s3_region;
  return cachedClient;
}

/**
 * Check whether S3 is configured. If any required field is missing, returns false.
 */
export function isS3Configured(config: PipelineConfig): boolean {
  return !!(
    config.aws_s3_bucket &&
    config.aws_access_key_id &&
    config.aws_secret_access_key
  );
}

/**
 * Upload a local file to S3 and return the public URL.
 *
 * Files are stored under `videos/<key>` in the bucket.
 * The bucket must have public read access enabled (or a CloudFront distribution).
 */
export async function uploadVideoToS3(
  config: PipelineConfig,
  localPath: string,
  key: string,
): Promise<string> {
  const client = getClient(config);
  const body = fs.readFileSync(localPath);

  const contentType = key.endsWith(".jpg") || key.endsWith(".jpeg")
    ? "image/jpeg"
    : key.endsWith(".png")
      ? "image/png"
      : "video/mp4";

  await client.send(
    new PutObjectCommand({
      Bucket: config.aws_s3_bucket,
      Key: `videos/${key}`,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `https://${config.aws_s3_bucket}.s3.${config.aws_s3_region}.amazonaws.com/videos/${key}`;
}
