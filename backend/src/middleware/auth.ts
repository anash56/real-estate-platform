// This middleware verifies JWT tokens on protected routes

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../utils/types';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: UserPayload;
    }
  }
}

const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    // Header format: "Authorization: Bearer TOKEN"
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login first.'
      });
    }

    // Verify token
    // jwt.verify() checks if token is valid and not expired
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as UserPayload;

    // Attach userId to request
    // Now we can access req.userId in other routes
    req.userId = decoded.userId;
    req.user = decoded;

    // Continue to next middleware/route
    next();
  } catch (error: any) {
    // Token is invalid or expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

export default auth;