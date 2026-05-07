import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';
import { sendEmail } from '../utils/email';

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
      where: { id: propertyId as string },
      include: {
        agent: {
          select: { email: true, fullName: true }
        }
      }
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

    // Create In-App Notification for the Agent
    const notification = await (prisma as any).notification.create({
      data: {
        userId: property.agentId,
        title: 'New Inquiry Received',
        message: `A potential buyer has inquired about "${property.title}".`,
        link: '/dashboard/agent'
      }
    });
    
    req.app.get('io')?.to(`user_${property.agentId}`).emit('new_notification', notification);

    // 3. Send email notification to agent
    if (property.agent) {
        const subject = `You have a new inquiry on "${property.title}"`;
        const text = `Hi ${property.agent.fullName},\n\nA potential buyer has sent an inquiry for your property listing: "${property.title}".\n\nMessage from buyer:\n"${message}"\n\nPlease log in to your dashboard to respond.`;
        await sendEmail(property.agent.email, subject, text);
    }

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
    const maskedInquiries = inquiries.map((inq: any) => ({
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
    const formattedInquiries = inquiries.map((inq: any) => ({ ...inq, budget: inq.budget?.toString() }));
    res.json({ success: true, data: formattedInquiries });
  } catch (error) {
    console.error('❌ Fetch sent inquiries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sent inquiries' });
  }
});

// ============================================
// ROUTE: PUT /api/inquiries/:id/respond
// ============================================
// For Agents: Respond to a buyer's inquiry

router.put('/:id/respond', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    // Verify the inquiry exists and the property belongs to the agent
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string },
      include: { property: true }
    });

    if (!inquiry || inquiry.property.agentId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to respond to this inquiry' });
    }

    const updatedInquiry = await prisma.inquiry.update({
      where: { id: id as string },
      data: {
        agentResponse: response,
        respondedAt: new Date(),
        status: 'RESPONDED' // Update status
      }
    });

    // Notify Buyer of Response
    const notification = await (prisma as any).notification.create({
      data: {
        userId: inquiry.buyerId,
        title: 'Agent Responded',
        message: `The agent responded to your inquiry regarding "${inquiry.property.title}".`,
        link: '/dashboard/buyer'
      }
    });
    
    req.app.get('io')?.to(`user_${inquiry.buyerId}`).emit('new_notification', notification);

    res.json({ success: true, message: 'Response sent successfully', data: { ...updatedInquiry, budget: updatedInquiry.budget?.toString() } });
  } catch (error) {
    console.error('❌ Respond to inquiry error:', error);
    res.status(500).json({ success: false, error: 'Failed to send response' });
  }
});

// ============================================
// ROUTE: PUT /api/inquiries/:id/reveal
// ============================================
// For Buyers: Reveal their contact info to the agent

router.put('/:id/reveal', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify the inquiry exists and belongs to the buyer
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: id as string }
    });

    if (!inquiry || inquiry.buyerId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this inquiry' });
    }

    const updatedInquiry = await prisma.inquiry.update({
      where: { id: id as string },
      data: {
        buyerEmailHidden: false,
        buyerPhoneHidden: false
      }
    });

    res.json({ success: true, message: 'Contact info revealed to agent', data: { ...updatedInquiry, budget: updatedInquiry.budget?.toString() } });
  } catch (error) {
    console.error('❌ Reveal contact info error:', error);
    res.status(500).json({ success: false, error: 'Failed to reveal contact info' });
  }
});

// ============================================
// ROUTE: GET /api/inquiries/:id/messages
// ============================================
// Get chat history for an inquiry

router.get('/:id/messages', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messages = await (prisma as any).message.findMany({
      where: { inquiryId: id as string },
      include: { sender: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ Fetch messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

export default router;