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
    const formattedProperties = properties.map((p: any) => ({
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

// ============================================
// ROUTE: PUT /api/moderation/documents/:id/verify
// ============================================
// Toggle verification status of a legal document

router.put('/documents/:id/verify', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });

    const { id } = req.params;
    const document = await prisma.legalDocument.findUnique({ where: { id } });
    if (!document) return res.status(404).json({ success: false, error: 'Document not found' });

    const updatedDoc = await prisma.legalDocument.update({
      where: { id },
      data: { isVerified: !document.isVerified }
    });

    res.json({ success: true, message: 'Document verification updated', data: updatedDoc });
  } catch (error) {
    console.error('❌ Verify document error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify document' });
  }
});

// ============================================
// ROUTE: GET /api/moderation/reviews
// ============================================
// Fetch all reviews for moderation

router.get('/reviews', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const reviews = await (prisma as any).review.findMany({
      include: {
        reviewer: { select: { fullName: true, email: true } },
        property: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('❌ Fetch moderation reviews error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// ============================================
// ROUTE: PUT /api/moderation/reviews/:id/toggle-approval
// ============================================
// Ban/Hide or Approve a review

router.put('/reviews/:id/toggle-approval', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });

    const { id } = req.params;
    const review = await (prisma as any).review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

    const updatedReview = await (prisma as any).review.update({
      where: { id },
      data: { isApproved: !review.isApproved }
    });

    res.json({ success: true, message: 'Review status updated', data: updatedReview });
  } catch (error) {
    console.error('❌ Toggle review approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to update review status' });
  }
});

// ============================================
// ROUTE: DELETE /api/moderation/reviews/:id
// ============================================
// Delete an inappropriate review permanently

router.delete('/reviews/:id', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });

    const { id } = req.params;
    await (prisma as any).review.delete({ where: { id } });

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('❌ Delete review error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
});

export default router;