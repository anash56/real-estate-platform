import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// Create a dispute
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { agentId, propertyId, reason } = req.body;
    if (!agentId || !reason) return res.status(400).json({ success: false, error: 'Agent ID and reason are required' });

    const dispute = await (prisma as any).dispute.create({
      data: {
        buyerId: req.userId as string,
        agentId,
        propertyId,
        reason
      }
    });
    res.status(201).json({ success: true, message: 'Dispute raised successfully', data: dispute });
  } catch (error) {
    console.error('❌ Dispute creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to raise dispute' });
  }
});

export default router;