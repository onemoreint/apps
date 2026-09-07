import { z } from 'zod';

/**
 * Validate URL format and domain
 */
export function validateUrl(url) {
  const schema = z.string().url().min(10).max(2048);

  try {
    schema.parse(url);

    // Additional checks
    const urlObj = new URL(url);

    // Ensure protocol is http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }

    // Check for localhost or private IPs (security)
    const hostname = urlObj.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      throw new Error('Local URLs are not allowed');
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

/**
 * Validate product data structure
 */
export const productSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  brand: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  sku: z.string().max(50).optional(),
  mpn: z.string().max(50).optional(),
  gtin: z.string().max(20).optional(),
  ean: z.string().max(20).optional(),
  upc: z.string().max(20).optional(),
  asin: z.string().max(20).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(200).optional(),
  images: z.array(z.string().url()).optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  originalPrice: z.number().positive().optional(),
  availability: z.string().max(100).optional(),
  seller: z.string().max(200).optional(),
  specifications: z.record(z.any()).optional(),
  dimensions: z
    .object({
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      depth: z.number().positive().optional(),
      weight: z.number().positive().optional(),
      unit: z.string().optional(),
    })
    .optional(),
  material: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  variant: z.record(z.any()).optional(),
  sourceUrl: z.string().url().optional(),
});

/**
 * Validate analyze request
 */
export const analyzeRequestSchema = z.object({
  url: z.string().url(),
});

/**
 * Validate search request
 */
export const searchRequestSchema = z.object({
  query: z.string().min(3).max(500),
  marketplace: z.enum(['shein', 'aliexpress', 'temu']).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * Validate match score
 */
export function validateMatchScore(score) {
  const schema = z.number().min(0).max(100);
  return schema.parse(score);
}

/**
 * Validate match status
 */
export function validateMatchStatus(status) {
  const schema = z.enum(['exact', 'probable', 'unverified', 'rejected']);
  return schema.parse(status);
}

/**
 * Safe validation wrapper
 */
export function safeValidate(schema, data) {
  try {
    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }
    return {
      valid: true,
      data: result.data,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ message: error.message }],
    };
  }
}
