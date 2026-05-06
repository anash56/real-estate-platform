import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// ============================================
// ROUTE: POST /api/inquiries/:propertyId
// ============================================
// Send an inquiry without revealing contact info

router.post('/:propertyId', auth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { message, budget } = req.body;

    // 1. Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId as string }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Prevent agent from inquiring on their own property
    if (property.agentId === req.userId) {
      return res.status(400).json({ success: false, error: 'Cannot inquire on your own property' });
    }

    // 2. Create the inquiry with privacy flags ON by default
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: propertyId as string,
        buyerId: req.userId!,
        message,
        budget: budget ? BigInt(budget) : null,
        buyerEmailHidden: true,  // Ethical platform default
        buyerPhoneHidden: true   // Ethical platform default
      }
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry sent securely. Your contact info is hidden from the agent.',
      data: {
        ...inquiry,
        budget: inquiry.budget?.toString() // Convert BigInt for JSON serialization
      }
    });
  } catch (error) {
    console.error('❌ Inquiry creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to send inquiry' });
  }
});

// ============================================
// ROUTE: GET /api/inquiries/received
// ============================================
// For Agents: View inquiries received on their properties

router.get('/received', auth, async (req: Request, res: Response) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: {
        property: {
          agentId: req.userId as string
        }
      },
      include: {
        property: { select: { title: true, address: true, city: true } },
        buyer: { select: { fullName: true, email: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 🛡️ ENFORCE PRIVACY: Mask the buyer's email/phone before sending to agent
    const maskedInquiries = inquiries.map(inq => ({
      ...inq,
      budget: inq.budget?.toString(),
      buyer: {
        fullName: inq.buyer.fullName,
        email: inq.buyerEmailHidden ? 'Hidden by Platform' : inq.buyer.email,
        phone: inq.buyerPhoneHidden ? 'Hidden by Platform' : inq.buyer.phone
      }
    }));

    res.json({ success: true, data: maskedInquiries });
  } catch (error) {
    console.error('❌ Fetch received inquiries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inquiries' });
  }
});

// ============================================
// ROUTE: GET /api/inquiries/sent
// ============================================
// For Buyers: View inquiries they have sent

router.get('/sent', auth, async (req: Request, res: Response) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { buyerId: req.userId as string },
      include: { property: { select: { title: true, address: true, agent: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' }
    });

    // Safe conversion of BigInt
    const formattedInquiries = inquiries.map(inq => ({ ...inq, budget: inq.budget?.toString() }));
    res.json({ success: true, data: formattedInquiries });
  } catch (error) {
    console.error('❌ Fetch sent inquiries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sent inquiries' });
  }
});

export default router;