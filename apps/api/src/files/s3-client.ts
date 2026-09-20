import { S3Client } from '@aws-sdk/client-s3';
import fileConfig from './config/file.config';
import { FileConfig } from './config/file-config.type';
let client: S3Client | undefined;

/** Reuse connections and let the AWS default credential chain support workload identity. */
export function getS3Client(): S3Client {
  if (!client) {
    const config = fileConfig() as FileConfig;
    client = new S3Client({
      region: config.awsS3Region,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }
  return client;
}
