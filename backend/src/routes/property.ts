import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { evaluatePropertyRisk } from '../utils/moderation';

const router = express.Router();

// ============================================
// ROUTE 1: POST /api/properties
// ============================================
// Create a new property listing with Auto-Flagging

router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      price,
      amenities,
      isDraft // Client can explicitly save as DRAFT
    } = req.body;

    // 1. Run Auto-Flagging System
    const moderationResult = evaluatePropertyRisk({
      title,
      description,
      propertyType,
      amenities
    });

    // 2. Save Property to Database
    const property = await prisma.property.create({
      data: {
        agentId: req.userId!,
        title,
        description,
        propertyType,
        bedrooms,
        bathrooms,
        area,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        price: BigInt(price),
        amenities,
        status: isDraft ? 'DRAFT' : 'ACTIVE',
        moderationStatus: isDraft ? 'PENDING_REVIEW' : moderationResult.status,
        riskScore: moderationResult.score,
        flaggedReasons: moderationResult.reasons
      }
    });

    res.status(201).json({
      success: true,
      message: isDraft ? 'Saved as draft' : 'Property submitted for review',
      data: { 
        property: {
          ...property,
          price: property.price.toString() // Convert BigInt to string to prevent JSON serialization crash
        }, 
        moderationResult 
      }
    });
  } catch (error) {
    console.error('❌ Property creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create property listing' });
  }
});

export default router;