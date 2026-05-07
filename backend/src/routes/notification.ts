import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const notifications = await (prisma as any).notification.findMany({
      where: { userId: req.userId as string },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req: Request, res: Response) => {
  try {
    await (prisma as any).notification.updateMany({
      where: { userId: req.userId as string, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
});

export default router;