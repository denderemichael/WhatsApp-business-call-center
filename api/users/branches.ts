import type { VercelRequest, VercelResponse } from '../types/vercel.js';

/**
 * Get Branches Handler
 * GET /api/users/branches
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    response.status(200).json({
      branches: [],
    });
  } catch (error) {
    console.error('Get branches error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}
