// Authentication routes: signup, login, get current user

import express, { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { SignupRequest, LoginRequest, AuthResponse } from '../utils/types';

const router = express.Router();

// ============================================
// ROUTE 1: POST /api/auth/signup
// ============================================
// Register new user account
// Request body: { email, password, fullName }
// Returns: { token, user }

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body as SignupRequest;

    // ✓ Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required'
      });
    }

    // ✓ Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // ✓ Check password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // ✓ Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // ✓ Hash password
    // Hashing: password "hello" → "asdfjkl2341$%^&*"
    // Can't reverse it (one-way encryption)
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    console.log(`Creating user: ${email}`);

    // ✓ Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'BUYER' // Default role
      }
    });

    console.log(`User created: ${user.id}`);

    // ✓ Generate JWT token
    // Token will expire in 7 days
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // ✓ Return success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      } as AuthResponse
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Signup failed. Please try again.'
    });
  }
});

// ============================================
// ROUTE 2: POST /api/auth/login
// ============================================
// Login existing user
// Request body: { email, password }
// Returns: { token, user }

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // ✓ Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // ✓ Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // ✓ Compare passwords
    // bcryptjs.compare() checks if entered password matches hashed password
    // compare("hello", "asdfjkl2341$%^&*") → true/false
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log(`User logged in: ${user.email}`);

    // ✓ Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // ✓ Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      } as AuthResponse
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// ============================================
// ROUTE 3: GET /api/auth/me
// ============================================
// Get current logged-in user (requires token)
// Header: Authorization: Bearer TOKEN
// Returns: { user }

router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    // ✓ Get user from database using userId from token
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // ✓ Return user data (NEVER include password)
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// ============================================
// ROUTE 4: POST /api/auth/logout
// ============================================
// Logout (frontend deletes token)

router.post('/logout', auth, (req: Request, res: Response) => {
  // Backend doesn't do anything special
  // Frontend deletes token from localStorage
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
