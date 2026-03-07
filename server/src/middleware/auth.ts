import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabaseAdmin, type User } from '../lib/supabase';
import { inMemoryStore } from '../lib/inMemoryStore';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

// Role hierarchy
export const ROLES = {
  admin: ['admin', 'manager', 'branch_manager', 'agent'],
  manager: ['manager', 'branch_manager', 'agent'],
  branch_manager: ['branch_manager', 'agent'],
  agent: ['agent'],
} as const;

export type Role = keyof typeof ROLES;

// Verify JWT token and attach user to request
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    let decoded: { userId: string; role: string } | null = null;
    
    try {
      decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
    } catch (err) {
      // Token might be a Supabase session token, try to validate it
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      
      // Get user from our users table
      const { data: appUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!appUser) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      req.user = appUser;
      req.userId = appUser.id;
      next();
      return;
    }

    // Get user from our users table
    let appUser = null;
    let lookupError = null;
    
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();
      
      appUser = data;
      lookupError = error;
    } catch (dbError) {
      // Database not available, will try in-memory store
      lookupError = dbError;
    }

    // If database lookup failed or user not found, try in-memory store
    if (!appUser) {
      const memoryUser = inMemoryStore.getUserById(decoded.userId);
      if (memoryUser) {
        appUser = memoryUser;
      }
    }

    if (!appUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = appUser;
    req.userId = appUser.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if user has required role
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userRole = req.user.role as Role;
    
    // Admin has access to everything
    if (userRole === 'admin') {
      next();
      return;
    }

    // Check if user's role is in allowed roles or has higher privilege
    const userRoleKey = userRole as Role;
    const hasAccess = allowedRoles.some(role => 
      (ROLES[userRoleKey] as readonly string[]).includes(role)
    );

    if (!hasAccess) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Try to verify token but don't fail if invalid
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      
      const { data: appUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (appUser) {
        req.user = appUser;
        req.userId = appUser.id;
      }
    } catch (err) {
      // Token invalid, continue without user
    }

    next();
  } catch (error) {
    next();
  }
};

// Generate JWT token for user
export const generateToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
};
