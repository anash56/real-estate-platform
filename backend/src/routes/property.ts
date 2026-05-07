import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { evaluatePropertyRisk } from '../utils/moderation';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure Multer for local image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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

// ============================================
// ROUTE 2: GET /api/properties
// ============================================
// Get all public active properties

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const whereClause: any = {
      status: 'ACTIVE',
      moderationStatus: 'APPROVED'
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
        { propertyType: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const properties = await (prisma as any).property.findMany({
      where: whereClause,
      include: {
        legalDocuments: true,
        defectDisclosure: true,
        images: true
      },
      orderBy: { createdAt: 'desc' },
      take: 9 // Limit to 9 recent properties for the home page grid
    });

    const formattedProperties = properties.map((p: any) => ({ ...p, price: p.price.toString() }));
    
    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('❌ Fetch public properties error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch properties' });
  }
});

// ============================================
// ROUTE 3: GET /api/properties/agent
// ============================================
// Get all properties listed by the logged-in agent

router.get('/agent', auth, async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      where: { agentId: req.userId as string },
      include: { images: true },
      orderBy: { createdAt: 'desc' }
    });

    // Safely convert BigInt to string
    const formattedProperties = properties.map((p: any) => ({ ...p, price: p.price.toString() }));
    
    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('❌ Fetch agent properties error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent properties' });
  }
});

// ============================================
// ROUTE 4: GET /api/properties/favorites
// ============================================
// Get all saved properties for the logged-in user

router.get('/favorites', auth, async (req: Request, res: Response) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId as string },
      include: { property: { include: { images: true } } },
      orderBy: { addedAt: 'desc' }
    });

    // Extract the nested property and safely convert BigInt price to string
    const formattedFavorites = favorites.map((fav: any) => ({
      ...fav.property,
      price: fav.property.price.toString()
    }));

    res.json({ success: true, data: formattedFavorites });
  } catch (error) {
    console.error('❌ Fetch favorites error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved properties' });
  }
});

// ============================================
// ROUTE 5: GET /api/properties/:id
// ============================================
// Get single property details (Public Route)

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = await (prisma as any).property.findUnique({
      where: { id: id as string },
      include: {
        agent: { select: { fullName: true, email: true, phone: true } },
        defectDisclosure: true,
        legalDocuments: true,
        images: { orderBy: { order: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: { reviewer: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Increment view count in the database
    await (prisma as any).property.update({
      where: { id: id as string },
      data: { viewCount: { increment: 1 } }
    });
    property.viewCount = (property.viewCount || 0) + 1;

    // Safely convert BigInt to string
    res.json({ success: true, data: { ...property, price: property.price.toString() } });
  } catch (error) {
    console.error('❌ Fetch property error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch property details' });
  }
});

// ============================================
// ROUTE 6: POST /api/properties/:id/favorite
// ============================================
// Add property to favorites

router.post('/:id/favorite', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.favorite.create({
      data: {
        userId: req.userId as string,
        propertyId: id as string
      }
    });
    res.json({ success: true, message: 'Property added to favorites' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Property already in favorites' });
    }
    console.error('❌ Add favorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to add favorite' });
  }
});

// ============================================
// ROUTE 7: DELETE /api/properties/:id/favorite
// ============================================
// Remove property from favorites

router.delete('/:id/favorite', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId: req.userId as string,
          propertyId: id as string
        }
      }
    });
    res.json({ success: true, message: 'Property removed from favorites' });
  } catch (error) {
    console.error('❌ Remove favorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove favorite' });
  }
});

// ============================================
// ROUTE 8: POST /api/properties/:id/reviews
// ============================================
// Leave a review on a property

router.post('/:id/reviews', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, title, description } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: id as string }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const review = await (prisma as any).review.create({
      data: {
        propertyId: id as string,
        reviewerId: req.userId as string,
        rating: Number(rating),
        title,
        description
      },
      include: { reviewer: { select: { fullName: true } } }
    });

    res.status(201).json({ success: true, message: 'Review added successfully', data: review });
  } catch (error) {
    console.error('❌ Add review error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

// ============================================
// ROUTE 9: PUT /api/properties/:id
// ============================================
// Update an existing property listing

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, propertyType, price, address, city, amenities, submitForReview } = req.body;

    // 1. Verify property exists and belongs to the agent
    const property = await prisma.property.findUnique({
      where: { id: id as string }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.agentId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this property' });
    }

    // If submitting a draft/rejected property for review, re-run moderation
    if (submitForReview && (property.status === 'DRAFT' || property.status === 'REJECTED')) {
      const moderationResult = evaluatePropertyRisk({
        title,
        description,
        propertyType,
        amenities: amenities || property.amenities
      });

      const updatedProperty = await prisma.property.update({
        where: { id: id as string },
        data: {
          title, description, propertyType, address, city,
          price: price ? BigInt(price) : property.price,
          amenities: amenities || property.amenities,
          status: 'ACTIVE', // No longer a draft, it's in the queue
          moderationStatus: moderationResult.status,
          riskScore: moderationResult.score,
          flaggedReasons: moderationResult.reasons
        }
      });
      return res.json({ success: true, message: 'Property submitted for review', data: { ...updatedProperty, price: updatedProperty.price.toString() } });
    }

    // 2. Otherwise, just update property details (normal update)
    const updatedProperty = await prisma.property.update({
      where: { id: id as string },
      data: {
        title,
        description,
        propertyType,
        address,
        city,
        price: price ? BigInt(price) : property.price,
        amenities: amenities || property.amenities,
      }
    });

    res.json({ success: true, message: 'Property updated successfully', data: { ...updatedProperty, price: updatedProperty.price.toString() } });
  } catch (error) {
    console.error('❌ Property update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update property' });
  }
});

// ============================================
// ROUTE 10: POST /api/properties/:id/images
// ============================================
// Upload multiple images for a property

router.post('/:id/images', auth, upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = (req as any).files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const property = await prisma.property.findUnique({ where: { id: id as string } });
    if (!property || property.agentId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this property' });
    }

    const imageRecords = files.map((file: any, index: number) => ({
      propertyId: id as string,
      imageUrl: `/uploads/${file.filename}`,
      order: index,
      isMainImage: index === 0 // Make the first uploaded image the main one
    }));

    await prisma.propertyImage.createMany({ data: imageRecords });

    res.status(201).json({ success: true, message: 'Images uploaded successfully' });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

export default router;