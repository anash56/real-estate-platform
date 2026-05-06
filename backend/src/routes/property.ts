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
        defectDisclosure: true
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
      orderBy: { createdAt: 'desc' }
    });

    // Safely convert BigInt to string
    const formattedProperties = properties.map(p => ({ ...p, price: p.price.toString() }));
    
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
      include: { property: true },
      orderBy: { addedAt: 'desc' }
    });

    // Extract the nested property and safely convert BigInt price to string
    const formattedFavorites = favorites.map(fav => ({
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
        legalDocuments: true
      }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

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
// ROUTE 8: PUT /api/properties/:id
// ============================================
// Update an existing property listing

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, propertyType, price, address, city } = req.body;

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

    // 2. Update property
    const updatedProperty = await prisma.property.update({
      where: { id: id as string },
      data: {
        title,
        description,
        propertyType,
        price: price ? BigInt(price) : property.price,
        address,
        city
      }
    });

    res.json({ success: true, message: 'Property updated successfully', data: { ...updatedProperty, price: updatedProperty.price.toString() } });
  } catch (error) {
    console.error('❌ Property update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update property' });
  }
});

export default router;