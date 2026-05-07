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
      virtualTourUrl,
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
        priceHistory: {
          create: { price: BigInt(price) }
        },
        amenities,
        virtualTourUrl,
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
    const { search, minPrice, maxPrice, bedrooms, bathrooms, propertyType, amenities } = req.query;
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

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = BigInt(minPrice as string);
      if (maxPrice) whereClause.price.lte = BigInt(maxPrice as string);
    }

    if (bedrooms) whereClause.bedrooms = { gte: Number(bedrooms) };
    if (bathrooms) whereClause.bathrooms = { gte: Number(bathrooms) };
    if (propertyType) whereClause.propertyType = propertyType as string;

    if (amenities) {
      // "hasEvery" ensures the property has ALL the requested amenities
      const amenitiesList = (amenities as string).split(',').map(a => a.trim());
      whereClause.amenities = { hasEvery: amenitiesList };
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
// ROUTE 2.5: GET /api/properties/agent/analytics
// ============================================
// Get performance analytics for an agent's listings

router.get('/agent/analytics', auth, async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      where: { agentId: req.userId as string },
      select: { id: true, viewCount: true }
    });

    const propertyIds = properties.map((p: any) => p.id);
    const totalViews = properties.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0);

    const favorites = await prisma.favorite.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { addedAt: true }
    });

    const inquiries = await prisma.inquiry.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { createdAt: true }
    });

    // Group by month for the last 6 months
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.getMonth(), year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }), Favorites: 0, Inquiries: 0, Views: 0 };
    });

    favorites.forEach((f: any) => {
      const m = last6Months.find(m => m.month === f.addedAt.getMonth() && m.year === f.addedAt.getFullYear());
      if (m) m.Favorites++;
    });

    inquiries.forEach((i: any) => {
      const m = last6Months.find(m => m.month === i.createdAt.getMonth() && m.year === i.createdAt.getFullYear());
      if (m) m.Inquiries++;
    });

    // Since we only track total views in the DB, we distribute them for the visual trendline
    const viewsPerMonth = Math.floor(totalViews / 6);
    last6Months.forEach(m => m.Views = viewsPerMonth + Math.floor(Math.random() * (viewsPerMonth * 0.2))); 

    const summary = { totalViews, totalFavorites: favorites.length, totalInquiries: inquiries.length, totalListings: properties.length };
    res.json({ success: true, data: { chartData: last6Months, summary } });
  } catch (error) {
    console.error('❌ Fetch analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// ============================================
// ROUTE 2.6: GET /api/properties/agent/reviews
// ============================================
// Get all reviews for an agent's properties

router.get('/agent/reviews', auth, async (req: Request, res: Response) => {
  try {
    const reviews = await (prisma as any).review.findMany({
      where: { property: { agentId: req.userId as string } },
      include: {
        property: { select: { title: true } },
        reviewer: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: reviews });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch reviews' }); }
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
// ROUTE 4.5: SAVED SEARCHES (Search Alerts)
// ============================================

router.post('/saved-searches', auth, async (req: Request, res: Response) => {
  try {
    const { name, filters } = req.body;
    const savedSearch = await (prisma as any).savedSearch.create({
      data: { userId: req.userId as string, name, filters }
    });
    res.json({ success: true, message: 'Search alert saved successfully', data: savedSearch });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to save search' }); }
});

router.get('/saved-searches', auth, async (req: Request, res: Response) => {
  try {
    const searches = await (prisma as any).savedSearch.findMany({
      where: { userId: req.userId as string },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: searches });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch saved searches' }); }
});

router.delete('/saved-searches/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).savedSearch.delete({
      where: { id: id as string, userId: req.userId as string }
    });
    res.json({ success: true, message: 'Saved search deleted' });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to delete saved search' }); }
});

// ============================================
// ROUTE 4.6: GET /api/properties/compare
// ============================================
// Fetch multiple properties for side-by-side comparison

router.get('/compare', async (req: Request, res: Response) => {
  try {
    const ids = req.query.ids as string;
    if (!ids) return res.json({ success: true, data: [] });
    
    const idArray = ids.split(',');
    const properties = await (prisma as any).property.findMany({
      where: { id: { in: idArray } },
      include: { agent: { select: { fullName: true } }, defectDisclosure: true, legalDocuments: true, images: true }
    });
    
    const formatted = properties.map((p: any) => ({ ...p, price: p.price.toString() }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch properties for comparison' });
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
        priceHistory: { orderBy: { changedAt: 'asc' } },
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

    const formattedProperty = {
      ...property,
      price: property.price.toString(),
      priceHistory: property.priceHistory?.map((ph: any) => ({ ...ph, price: ph.price.toString() }))
    };

    // Safely convert BigInt to string
    res.json({ success: true, data: formattedProperty });
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
// ROUTE 8.5: PUT /api/properties/reviews/:id/reply
// ============================================
// Agent replies to a review

router.put('/reviews/:id/reply', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const review = await (prisma as any).review.findUnique({
      where: { id: id as string },
      include: { property: true }
    });

    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    if (review.property.agentId !== req.userId) return res.status(403).json({ success: false, error: 'Unauthorized to reply to this review' });

    const updatedReview = await (prisma as any).review.update({ where: { id: id as string }, data: { agentReply: reply, repliedAt: new Date() } });
    res.json({ success: true, message: 'Reply posted successfully', data: updatedReview });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to post reply' }); }
});

// ============================================
// ROUTE 9: PUT /api/properties/:id
// ============================================
// Update an existing property listing

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, propertyType, price, address, city, amenities, virtualTourUrl, submitForReview } = req.body;

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
          virtualTourUrl: virtualTourUrl !== undefined ? virtualTourUrl : property.virtualTourUrl,
          status: 'ACTIVE', // No longer a draft, it's in the queue
          moderationStatus: moderationResult.status,
          riskScore: moderationResult.score,
          flaggedReasons: moderationResult.reasons,
          ...(price && BigInt(price) !== property.price ? { priceHistory: { create: { price: BigInt(price) } } } : {})
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
        virtualTourUrl: virtualTourUrl !== undefined ? virtualTourUrl : property.virtualTourUrl,
        ...(price && BigInt(price) !== property.price ? { priceHistory: { create: { price: BigInt(price) } } } : {})
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

// ============================================
// ROUTE 11: POST /api/properties/generate-description
// ============================================
// Generate AI Property Description

router.post('/generate-description', auth, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    let generatedText = "";
    
    // If you add GEMINI_API_KEY to your backend .env file, it will use real AI!
    if (process.env.GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Write a professional, engaging, and ethical real estate property description based on these features. Make it 2-3 paragraphs. Features: ${prompt}` }] }] })
      });
      const data = await response.json();
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate. Please write manually.";
    } else {
      // Fallback Mock if no API key is provided
      generatedText = `Welcome to this stunning property! \n\nKey Highlights:\n${prompt.split(',').map((p: string) => `• ${p.trim()}`).join('\n')}\n\nThis beautiful home offers a perfect blend of comfort and modern living. Built with attention to detail and designed for convenience, it stands as an incredible opportunity to own a piece of prime real estate. Contact us today for a viewing!`;
    }

    res.json({ success: true, data: generatedText });
  } catch (error) {
    console.error('❌ AI Generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate description' });
  }
});

export default router;