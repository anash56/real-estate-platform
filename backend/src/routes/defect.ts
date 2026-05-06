import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import auth from '../middleware/auth';

const router = express.Router();

// ============================================
// ROUTE: POST /api/defects/:propertyId
// ============================================
// Submit mandatory defect disclosure for a property

router.post('/:propertyId', auth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const {
      hasStructuralIssues,
      structuralIssuesDetails,
      hasLegalDisputes,
      legalDisputesDetails,
      hasPreviousDamage,
      previousDamageDetails,
      hasEnvironmentalHazards,
      environmentalHazardsDetails,
      agentSignedOff
    } = req.body;

    // 1. Verify property belongs to the logged-in agent
    const property = await prisma.property.findUnique({
      where: { id: propertyId as string }
    });

    if (!property || property.agentId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this property' });
    }

    // 2. Enforce agent sign-off (Mandatory ethical requirement)
    if (!agentSignedOff) {
      return res.status(400).json({ success: false, error: 'Agent must sign off confirming all information is accurate' });
    }

    // 3. Save Disclosure
    const defect = await (prisma as any).defectDisclosure.create({
      data: {
        propertyId,
        hasStructuralIssues, structuralIssuesDetails,
        hasLegalDisputes, legalDisputesDetails,
        hasPreviousDamage, previousDamageDetails,
        hasEnvironmentalHazards, environmentalHazardsDetails,
        agentSignedOff
      }
    });

    res.status(201).json({ success: true, message: 'Defect disclosure saved', data: defect });
  } catch (error) {
    console.error('❌ Defect disclosure error:', error);
    res.status(500).json({ success: false, error: 'Failed to save defect disclosure' });
  }
});

export default router;