// Authentication routes: signup, login, get current user

import express, { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { SignupRequest, LoginRequest, AuthResponse } from '../utils/types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendEmail } from '../utils/email';
import twilio from 'twilio';

// Configure Multer for local avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Configure Multer for Government IDs
const idStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/ids');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'id-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadId = multer({ storage: idStorage });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const router = express.Router();

// ============================================
// ROUTE 1: POST /api/auth/signup
// ============================================
// Register new user account
// Request body: { email, password, fullName }
// Returns: { token, user }

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role, acceptedTerms } = req.body;

    // ✓ Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required'
      });
    }

    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the ethical guidelines and terms of service to register.'
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
        role: role || 'BUYER', // Use frontend provided role or default
        agreements: {
          create: {
            agreementType: 'TERMS_AND_ETHICAL_GUIDELINES',
            accepted: true,
            acceptedAt: new Date()
          }
        }
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

    // ✓ Check if user is suspended
    if ((user as any).isSuspended) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by the administrator.'
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
        governmentId: user.governmentId,
        idVerified: user.idVerified,
        agentLicense: user.agentLicense,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
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

// ============================================
// ROUTE 5: PUT /api/auth/profile
// ============================================
// Update user profile (name, phone)

router.put('/profile', auth, async (req: Request, res: Response) => {
  try {
    const { fullName, phone, agentLicense } = req.body;
    
    // If the phone number is changed, reset its verification status
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId as string } });
    const phoneChanged = currentUser?.phone !== phone;

    const user = await prisma.user.update({
      where: { id: req.userId as string },
      data: { fullName, phone, agentLicense, phoneVerified: phoneChanged ? false : currentUser?.phoneVerified }
    });
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ============================================
// ROUTE 6: POST /api/auth/profile/avatar
// ============================================
// Upload and update profile photo

router.post('/profile/avatar', auth, upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.userId as string },
      data: { profilePhoto: avatarUrl },
      select: { profilePhoto: true }
    });
    res.json({ success: true, message: 'Avatar updated', data: user });
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
});

// ============================================
// ROUTE 6.5: POST /api/auth/profile/government-id
// ============================================
// Upload Government ID for verification

router.post('/profile/government-id', auth, uploadId.single('governmentId'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document uploaded' });
    }
    const idUrl = `/uploads/ids/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.userId as string },
      data: { governmentId: idUrl, idVerified: false }, // Reset verification on new upload
      select: { governmentId: true, idVerified: true }
    });
    res.json({ success: true, message: 'Government ID uploaded successfully', data: user });
  } catch (error) {
    console.error('❌ Gov ID upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload Government ID' });
  }
});

// ============================================
// ROUTE 7: POST /api/auth/verify/email/send
// ============================================
// Generate and "send" an email OTP

router.post('/verify/email/send', auth, async (req: Request, res: Response) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // Expires in 10 mins
    
    const user = await prisma.user.update({
      where: { id: req.userId as string },
      data: { emailOtp: otp, emailOtpExpiry: expiry }
    });
    
    const emailText = `Your Email Verification OTP is: ${otp}\n\nThis code will expire in 10 minutes.`;
    await sendEmail(user.email, 'Verify your email - Ethical Real Estate', emailText);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ============================================
// ROUTE 8: POST /api/auth/verify/email/confirm
// ============================================
// Verify the email OTP

router.post('/verify/email/confirm', auth, async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId as string } });
    
    if (!user || user.emailOtp !== otp || !user.emailOtpExpiry || user.emailOtpExpiry < new Date()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }
    
    await prisma.user.update({
      where: { id: req.userId as string },
      data: { emailVerified: true, emailOtp: null, emailOtpExpiry: null }
    });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// ============================================
// ROUTE 9: POST /api/auth/verify/phone/send
// ============================================
router.post('/verify/phone/send', auth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId as string } });
    if (!user || !user.phone) {
      return res.status(400).json({ success: false, error: 'Phone number not found on profile. Please add one first.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); 
    await prisma.user.update({
      where: { id: req.userId as string },
      data: { phoneOtp: otp, phoneOtpExpiry: expiry }
    });

    await twilioClient.messages.create({
      body: `Your Ethical Real Estate verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER as string,
      to: user.phone
    });

    res.json({ success: true, message: 'OTP sent to your phone' });
  } catch (error) {
    console.error('❌ Twilio SMS error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ============================================
// ROUTE 10: POST /api/auth/verify/phone/confirm
// ============================================
router.post('/verify/phone/confirm', auth, async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId as string } });
    if (!user || user.phoneOtp !== otp || !user.phoneOtpExpiry || user.phoneOtpExpiry < new Date()) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    await prisma.user.update({ where: { id: req.userId as string }, data: { phoneVerified: true, phoneOtp: null, phoneOtpExpiry: null }});
    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to verify OTP' }); }
});

// ============================================
// ROUTE 11: POST /api/auth/password-reset/request
// ============================================
// Request a password reset code via email

router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    
    // For security reasons, always return success even if the email doesn't exist
    // This prevents bad actors from enumerating registered emails on your platform
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60000); // Expires in 15 minutes

      await prisma.user.update({
        where: { email },
        data: { resetPasswordOtp: otp, resetPasswordOtpExpiry: expiry }
      });

      const emailText = `We received a request to reset your password.\n\nYour password reset code is: ${otp}\n\nThis code will expire in 15 minutes. If you did not request this, you can safely ignore this email.`;
      await sendEmail(email, 'Password Reset Request - Ethical Real Estate', emailText);
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset code has been sent.' });
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// ============================================
// ROUTE 12: POST /api/auth/password-reset/reset
// ============================================
// Verify the reset code and update the password

router.post('/password-reset/reset', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, error: 'Email, code, and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetPasswordOtp !== otp || !user.resetPasswordOtpExpiry || user.resetPasswordOtpExpiry < new Date()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset code' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    await prisma.user.update({ where: { email }, data: { password: hashedPassword, resetPasswordOtp: null, resetPasswordOtpExpiry: null } });
    res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to reset password' }); }
});

export default router;
