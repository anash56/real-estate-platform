import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { sendEmail } from '../utils/email';

const router = express.Router();

// ============================================
// ROUTE: POST /api/tours/:propertyId
// ============================================
// Buyer requests a property tour
router.post('/:propertyId', auth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { date, message } = req.body;

    const property = await prisma.property.findUnique({ where: { id: propertyId as string }, include: { agent: true } });
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    if (property.agentId === req.userId) return res.status(400).json({ success: false, error: 'Cannot request a tour for your own property' });

    const tour = await (prisma as any).tourRequest.create({
      data: {
        buyerId: req.userId as string,
        propertyId,
        date: new Date(date),
        message
      }
    });

    // In-App Notification to Agent
    const notification = await (prisma as any).notification.create({
      data: {
        userId: property.agentId,
        title: 'New Tour Request',
        message: `You have a new tour request for "${property.title}" on ${new Date(date).toLocaleDateString()}.`,
        link: '/dashboard/agent'
      }
    });

    req.app.get('io')?.to(`user_${property.agentId}`).emit('new_notification', notification);

    if (property.agent) {
      const text = `Hi ${property.agent.fullName},\n\nYou have a new tour request for "${property.title}" on ${new Date(date).toLocaleDateString()}.\n\nMessage: ${message}\n\nPlease log in to your dashboard to approve or reject the request.`;
      await sendEmail(property.agent.email, `New Tour Request for "${property.title}"`, text);
    }

    res.status(201).json({ success: true, message: 'Tour requested successfully', data: tour });
  } catch (error) {
    console.error('❌ Tour request error:', error);
    res.status(500).json({ success: false, error: 'Failed to request tour' });
  }
});

// ============================================
// ROUTE: GET /api/tours/buyer
// ============================================
// Get all tours requested by the buyer
router.get('/buyer', auth, async (req: Request, res: Response) => {
  try {
    const tours = await (prisma as any).tourRequest.findMany({
      where: { buyerId: req.userId as string },
      include: { property: { select: { title: true, address: true, city: true, agent: { select: { fullName: true, phone: true } } } } },
      orderBy: { date: 'asc' }
    });
    res.json({ success: true, data: tours });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch tours' }); }
});

// ============================================
// ROUTE: GET /api/tours/agent
// ============================================
// Get all tours received by the agent
router.get('/agent', auth, async (req: Request, res: Response) => {
  try {
    const tours = await (prisma as any).tourRequest.findMany({
      where: { property: { agentId: req.userId as string } },
      include: { property: { select: { title: true } }, buyer: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { date: 'asc' }
    });
    res.json({ success: true, data: tours });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to fetch tours' }); }
});

// ============================================
// ROUTE: PUT /api/tours/:id/status
// ============================================
// Agent updates tour status (APPROVED / REJECTED)
router.put('/:id/status', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const tour = await (prisma as any).tourRequest.findUnique({ where: { id: id as string }, include: { property: true } });
    if (!tour || tour.property.agentId !== req.userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updatedTour = await (prisma as any).tourRequest.update({ where: { id: id as string }, data: { status } });
    
    // In-App Notification to Buyer
    const notification = await (prisma as any).notification.create({
      data: {
        userId: tour.buyerId,
        title: `Tour Request ${status}`,
        message: `Your tour request for "${tour.property.title}" on ${new Date(tour.date).toLocaleDateString()} was ${status.toLowerCase()}.`,
        link: '/dashboard/buyer'
      }
    });
    
    req.app.get('io')?.to(`user_${tour.buyerId}`).emit('new_notification', notification);

    res.json({ success: true, message: `Tour ${status.toLowerCase()}`, data: updatedTour });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to update tour status' }); }
});

export default router;