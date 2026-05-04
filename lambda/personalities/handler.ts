/**
 * Lambda: personalities
 *
 * Serves the personality catalog from S3.
 * Cached via CloudFront (1-hour TTL).
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({})
const SITE_BUCKET = process.env.SITE_BUCKET || 'lolabot-factory-site'

let cachedCatalog: string | null = null
let cacheTime = 0
const CACHE_TTL = 300_000 // 5 minutes

export async function handler() {
  const now = Date.now()

  if (cachedCatalog && now - cacheTime < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
      body: cachedCatalog,
    }
  }

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: SITE_BUCKET,
        Key: 'data/personalities.json',
      })
    )
    cachedCatalog = await response.Body?.transformToString() || '[]'
    cacheTime = now

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
      body: cachedCatalog,
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load personality catalog' }),
    }
  }
}
