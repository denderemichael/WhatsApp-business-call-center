/**
 * Type definitions for Vercel Serverless Functions
 * These types replicate the @vercel/node package for local development
 * when the package is not available.
 */

export interface VercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined> & {
    authorization?: string;
  };
  query: Record<string, string | string[]>;
  body: unknown;
  rawBody?: string;
  ip?: string;
  ips?: string[];
}

export interface VercelResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | number | string[]>;
  
  /**
   * Send a JSON response
   */
  json(body: unknown): this;
  
  /**
   * Send a response with status code
   */
  status(statusCode: number): this;
  
  /**
   * Set response headers
   */
  setHeader(name: string, value: string | number | string[]): this;
  
  /**
   * Get response header value
   */
  getHeader(name: string): string | number | string[] | undefined;
  
  /**
   * Remove a response header
   */
  removeHeader(name: string): this;
  
  /**
   * End the response
   */
  end(): this;
  
  /**
   * Send a string or buffer
   */
  send(body?: string | Buffer | unknown): this;
}
