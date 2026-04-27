const {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config();

// 1. Initialize the S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  },
});

/**
 * Helper function to upload an image
 * @param {Buffer} fileBuffer - Binary image data
 * @param {string} fileName - The desired name in S3
 * @param {string} mimeType - The file's MIME type (e.g., 'image/jpeg')
 */
async function uploadToS3(fileBuffer, articleId, fileName, mimeType) {
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `articles/${articleId}/${fileName}`, // Organized folder structure
    Body: fileBuffer,
    ContentType: mimeType, // Important for browser viewing
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Upload Success:", data);
    
    // Return the direct URL for your CMS to store in its database
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/articles/${articleId}/${fileName}`;
  } catch (err) {
    console.error("Upload Error:", err);
    throw err;
  }
}

/**
 * Best-effort cleanup for stale article photos in S3.
 * It lists files under articles/{articleId}/ and deletes files that are not referenced by request body.
 * Any list/delete failure is logged and never thrown.
 * @param {string} articleId - Article identifier
 * @param {Array<string>} requestedFileNames - File names that should remain in S3
 * @returns {Promise<void>}
 */
async function deleteStaleArticlePhotosInS3(articleId, requestedFileNames = []) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName || !articleId) {
    return;
  }

  const prefix = `articles/${articleId}/`;
  const retainedFileNames = new Set(
    (Array.isArray(requestedFileNames) ? requestedFileNames : [])
      .filter((fileName) => typeof fileName === 'string' && fileName.length > 0)
  );

  const keysToDelete = [];
  let continuationToken;

  try {
    do {
      const listResult = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const objectItem of listResult.Contents || []) {
        const key = objectItem.Key;
        if (!key || key.endsWith('/')) {
          continue;
        }

        const fileName = key.slice(prefix.length);
        if (!fileName || fileName.includes('/')) {
          continue;
        }

        if (!retainedFileNames.has(fileName)) {
          keysToDelete.push(key);
        }
      }

      continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (error) {
    console.error(`Failed to list S3 objects for article ${articleId}:`, error);
    return;
  }

  await Promise.all(
    keysToDelete.map(async (key) => {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }));
      } catch (error) {
        console.error(`Failed to delete S3 object ${key}:`, error);
      }
    })
  );
}

async function renameFolderInS3(oldArticleId, newArticleId) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName || !oldArticleId || !newArticleId || oldArticleId === newArticleId) {
    return;
  }

  const oldPrefix = `articles/${oldArticleId}/`;
  const newPrefix = `articles/${newArticleId}/`;

  try {
    let continuationToken;

    do {
      const listResult = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: oldPrefix,
        ContinuationToken: continuationToken,
      }));

      for (const objectItem of listResult.Contents || []) {
        const oldKey = objectItem.Key;
        if (!oldKey || oldKey.endsWith('/')) {
          continue;
        }

        const newKey = newPrefix + oldKey.slice(oldPrefix.length);
        try {
          await s3Client.send(new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${oldKey}`,
            Key: newKey,
          }));
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: oldKey,
          }));
        } catch (error) {
          console.error(`Failed to rename S3 object ${oldKey} to ${newKey}:`, error);
        }
      }

      continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (error) {
    console.error(`Failed to list S3 objects for article ${oldArticleId}:`, error);
  }
}

module.exports = {
  uploadToS3,
  deleteStaleArticlePhotosInS3,
  renameFolderInS3,
};