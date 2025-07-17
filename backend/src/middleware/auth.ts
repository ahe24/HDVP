import { Request, Response, NextFunction } from 'express';
import { config } from '../config/app';

// Fixed admin password (change to '70998' as requested)
const ADMIN_PASSWORD = '70998';

// Extend express-session types for TypeScript
import 'express-session';
declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    loginTime?: number;
  }
}

/**
 * Authentication middleware
 * Checks if user is authenticated via session
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource.'
    });
  }

  // Check if session is still valid (24 hours)
  const sessionAge = Date.now() - (req.session.loginTime || 0);
  const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in ms

  if (sessionAge > maxSessionAge) {
    req.session.destroy((err) => {
      if (err) console.error('Error destroying expired session:', err);
    });
    return res.status(401).json({
      success: false,
      error: 'Session expired',
      message: 'Your session has expired. Please log in again.'
    });
  }

  next();
};

/**
 * Login handler
 * Validates password and creates session
 */
export const login = (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Missing password',
      message: 'Password is required.'
    });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password',
      message: 'Incorrect password.'
    });
  }

  // Set session data
  req.session.isAuthenticated = true;
  req.session.loginTime = Date.now();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      isAuthenticated: true,
      loginTime: req.session.loginTime
    }
  });
};

/**
 * Logout handler
 * Destroys session
 */
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'Failed to destroy session.'
      });
    }
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
};

/**
 * Check authentication status
 * Returns current authentication state
 */
export const checkAuth = (req: Request, res: Response) => {
  const isAuthenticated = req.session.isAuthenticated || false;
  let expired = false;
  if (isAuthenticated) {
    const sessionAge = Date.now() - (req.session.loginTime || 0);
    const maxSessionAge = 24 * 60 * 60 * 1000;
    if (sessionAge > maxSessionAge) {
      req.session.destroy((err) => {
        if (err) console.error('Error destroying expired session:', err);
      });
      expired = true;
    }
  }
  res.json({
    success: true,
    data: {
      isAuthenticated: isAuthenticated && !expired,
      loginTime: isAuthenticated && !expired ? req.session.loginTime : null,
      expired
    }
  });
}; 