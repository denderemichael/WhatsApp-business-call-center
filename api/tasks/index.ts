import type { VercelRequest, VercelResponse } from '../types/vercel.js';

/**
 * Tasks Handler
 * GET /api/tasks
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  try {
    response.status(200).json({
      tasks: [],
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}
