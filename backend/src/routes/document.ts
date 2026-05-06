import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// ============================================
// ROUTE: POST /api/documents/:propertyId
// ============================================
// Upload mandatory legal documents for a property

router.post('/:propertyId', auth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { documentType, documentUrl } = req.body;

    // 1. Verify property belongs to the logged-in agent
    const property = await prisma.property.findUnique({
      where: { id: propertyId as string }
    });

    if (!property || property.agentId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this property' });
    }

    // 2. Validate document type against accepted mandatory documents
    const allowedTypes = ['TITLE_DEED', 'TAX_RECEIPT', 'MUNICIPAL_CARD', 'NOC', 'LEGAL_PAPERS'];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ success: false, error: 'Invalid document type' });
    }

    // 3. Save Document record
    const document = await (prisma as any).legalDocument.create({
      data: {
        propertyId,
        documentType,
        documentUrl,
        isVerified: false // Requires manual moderation step before badge is given
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Legal document uploaded successfully', 
      data: document 
    });
  } catch (error) {
    console.error('❌ Legal document upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

export default router;