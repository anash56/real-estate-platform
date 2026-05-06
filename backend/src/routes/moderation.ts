import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// Helper function to check if the user is an ADMIN
const checkIsAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  return user?.role === 'ADMIN';
};

// ============================================
// ROUTE: GET /api/moderation/queue
// ============================================
// Fetch all properties pending moderation review

router.get('/queue', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const properties = await prisma.property.findMany({
      where: { moderationStatus: 'PENDING_REVIEW' },
      include: {
        agent: { select: { fullName: true, email: true } },
        defectDisclosure: true,
        legalDocuments: true
      },
      orderBy: { createdAt: 'asc' } // Oldest first
    });

    // Safely convert BigInt price to string for JSON serialization
    const formattedProperties = properties.map(p => ({
      ...p,
      price: p.price.toString()
    }));

    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('❌ Fetch moderation queue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch moderation queue' });
  }
});

// ============================================
// ROUTE: POST /api/moderation/:propertyId/approve
// ============================================
// Approve a property and make it ACTIVE

router.post('/:propertyId/approve', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { propertyId } = req.params;

    const property = await prisma.property.update({
      where: { id: propertyId as string },
      data: {
        status: 'ACTIVE',
        moderationStatus: 'APPROVED'
      }
    });

    res.json({ success: true, message: 'Property approved and is now active', data: { ...property, price: property.price.toString() } });
  } catch (error) {
    console.error('❌ Property approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve property' });
  }
});

// ============================================
// ROUTE: POST /api/moderation/:propertyId/reject
// ============================================
// Reject a property with a reason

router.post('/:propertyId/reject', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { propertyId } = req.params;
    const { reason } = req.body;

    const property = await prisma.property.update({
      where: { id: propertyId as string },
      data: {
        status: 'REJECTED',
        moderationStatus: 'REJECTED',
        flaggedReasons: {
          push: reason || 'Manual rejection by admin without specified reason'
        }
      }
    });

    res.json({ success: true, message: 'Property rejected successfully', data: { ...property, price: property.price.toString() } });
  } catch (error) {
    console.error('❌ Property rejection error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject property' });
  }
});

export default router;