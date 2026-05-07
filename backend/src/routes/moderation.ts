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
        agent: { select: { id: true, fullName: true, email: true, governmentId: true, idVerified: true } },
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

    // 1. Check if the agent's Government ID is verified
    const propertyCheck = await prisma.property.findUnique({
      where: { id: propertyId as string },
      include: { agent: true }
    });
    if (!propertyCheck) return res.status(404).json({ success: false, error: 'Property not found' });
    if (!propertyCheck.agent.idVerified) {
      return res.status(400).json({ success: false, error: 'The Agent must have a Verified Government ID before their properties can be approved.' });
    }

    const property = await prisma.property.update({
      where: { id: propertyId as string },
      data: {
        status: 'ACTIVE',
        moderationStatus: 'APPROVED'
      }
    });

    // --- TRIGGER SAVED SEARCH ALERTS ---
    try {
      const savedSearches = await (prisma as any).savedSearch.findMany();
      for (const search of savedSearches) {
        const f = search.filters;
        let match = true;
        if (f.propertyType && property.propertyType !== f.propertyType) match = false;
        if (f.minPrice && property.price < BigInt(f.minPrice)) match = false;
        if (f.maxPrice && property.price > BigInt(f.maxPrice)) match = false;
        if (f.bedrooms && property.bedrooms < Number(f.bedrooms)) match = false;
        if (f.bathrooms && property.bathrooms < Number(f.bathrooms)) match = false;
        if (f.search) {
          const s = f.search.toLowerCase();
          if (!property.title.toLowerCase().includes(s) && !property.city.toLowerCase().includes(s) && !property.address.toLowerCase().includes(s)) match = false;
        }
        if (f.amenities && f.amenities.length > 0 && !f.amenities.every((a: string) => property.amenities.includes(a))) match = false;

        if (match) {
          const notification = await (prisma as any).notification.create({
            data: {
              userId: search.userId,
              title: 'New Property Alert! 🔔',
              message: `A new property matching your search "${search.name}" was just approved: ${property.title}`,
              link: `/property/${property.id}`
            }
          });
          req.app.get('io')?.to(`user_${search.userId}`).emit('new_notification', notification);
        }
      }
    } catch (e) { console.error('Failed to process search alerts', e); }

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
    const document = await prisma.legalDocument.findUnique({ where: { id: id as string } });
    if (!document) return res.status(404).json({ success: false, error: 'Document not found' });

    const updatedDoc = await prisma.legalDocument.update({
      where: { id: id as string },
      data: { isVerified: !document.isVerified }
    });

    res.json({ success: true, message: 'Document verification updated', data: updatedDoc });
  } catch (error) {
    console.error('❌ Verify document error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify document' });
  }
});

// ============================================
// ROUTE: PUT /api/moderation/users/:userId/verify-id
// ============================================
// Admin manually verifies an Agent's Government ID

router.put('/users/:userId/verify-id', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });

    const { userId } = req.params;
    await (prisma as any).user.update({
      where: { id: userId as string },
      data: { idVerified: true }
    });

    res.json({ success: true, message: 'Agent ID verified successfully' });
  } catch (error) {
    console.error('❌ Verify agent ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify agent ID' });
  }
});

// ============================================
// ROUTE: GET /api/moderation/analytics
// ============================================
// Fetch platform-wide analytics for admin
router.get('/analytics', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });

    const totalUsers = await (prisma as any).user.count();
    const suspendedUsers = await (prisma as any).user.count({ where: { isSuspended: true } });
    
    const totalProperties = await (prisma as any).property.count();
    const activeProperties = await (prisma as any).property.count({ where: { status: 'ACTIVE' } });
    const pendingProperties = await (prisma as any).property.count({ where: { moderationStatus: 'PENDING_REVIEW' } });
    
    const totalDisputes = await (prisma as any).dispute.count();
    const openDisputes = await (prisma as any).dispute.count({ where: { status: 'OPEN' } });
    
    const totalInquiries = await (prisma as any).inquiry.count();

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, suspended: suspendedUsers },
        properties: { total: totalProperties, active: activeProperties, pending: pendingProperties },
        disputes: { total: totalDisputes, open: openDisputes },
        inquiries: { total: totalInquiries }
      }
    });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch analytics' }); }
});

// ============================================
// ROUTE: GET /api/moderation/users
// ============================================
// Fetch all platform users
router.get('/users', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });
    
    const users = await (prisma as any).user.findMany({
      select: { id: true, fullName: true, email: true, role: true, isSuspended: true, createdAt: true, idVerified: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch users' }); }
});

// ============================================
// ROUTE: PUT /api/moderation/users/:id/suspend
// ============================================
// Toggle user suspension status
router.put('/users/:id/suspend', auth, async (req: Request, res: Response) => {
  try {
    const isAdmin = await checkIsAdmin(req.userId as string);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });
    
    const { id } = req.params;
    const user = await (prisma as any).user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    const updatedUser = await (prisma as any).user.update({
      where: { id },
      data: { isSuspended: !user.isSuspended }
    });
    res.json({ success: true, message: `User ${updatedUser.isSuspended ? 'suspended' : 'activated'}`, data: updatedUser });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to update user status' }); }
});

// ============================================
// ROUTE: GET /api/moderation/disputes
// ============================================
// Fetch all disputes
router.get('/disputes', auth, async (req: Request, res: Response) => {
  try {
     const isAdmin = await checkIsAdmin(req.userId as string);
     if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });
     
     const disputes = await (prisma as any).dispute.findMany({
       include: {
         buyer: { select: { fullName: true, email: true } },
         agent: { select: { fullName: true, email: true } },
         property: { select: { title: true } }
       },
       orderBy: { createdAt: 'desc' }
     });
     res.json({ success: true, data: disputes });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch disputes' }); }
});

// ============================================
// ROUTE: PUT /api/moderation/disputes/:id/resolve
// ============================================
router.put('/disputes/:id/resolve', auth, async (req: Request, res: Response) => {
  try {
     const isAdmin = await checkIsAdmin(req.userId as string);
     if (!isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });
     
     const { id } = req.params;
     const { status, adminNotes } = req.body;
     
     const updatedDispute = await (prisma as any).dispute.update({ where: { id }, data: { status, adminNotes } });
     res.json({ success: true, message: `Dispute marked as ${status}`, data: updatedDispute });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to resolve dispute' }); }
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