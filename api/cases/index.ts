import type { VercelRequest, VercelResponse } from '../types/vercel.js';

/**
 * Cases Handler
 * GET /api/cases
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  try {
    response.status(200).json({
      cases: [],
      total: 0,
    });
  } catch (error) {
    console.error('Get cases error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}
