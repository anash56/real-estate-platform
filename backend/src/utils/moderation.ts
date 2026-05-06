export interface PropertyDraft {
  title: string;
  description: string;
  propertyType: string;
  amenities: string[];
}

const PROHIBITED_TYPES = [
  'betting shop',
  'casino',
  'adult entertainment',
  'illegal business'
];

const PROHIBITED_KEYWORDS = [
  'bar on premises',
  'liquor store below',
  'gambling facility nearby',
  'bars',
  'pubs',
  'liquor store',
  'gambling'
];

/**
 * Calculates a risk score (0-100) based on property details.
 * > 75 = Auto-REJECT
 * 50-75 = PENDING_REVIEW
 * < 50 = APPROVED
 */
export const evaluatePropertyRisk = (property: PropertyDraft): { score: number; status: string; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // 1. Check Property Type
  const typeLower = property.propertyType.toLowerCase();
  if (PROHIBITED_TYPES.some(pt => typeLower.includes(pt))) {
    score += 80; // Instant reject territory
    reasons.push(`Prohibited property type detected: ${property.propertyType}`);
  }

  // 2. Check Amenities, Title, and Description for prohibited keywords
  const textToScan = [
    property.title.toLowerCase(),
    property.description.toLowerCase(),
    ...(property.amenities?.map(a => a.toLowerCase()) || [])
  ].join(' ');

  for (const keyword of PROHIBITED_KEYWORDS) {
    if (textToScan.includes(keyword)) {
      score += 40;
      reasons.push(`Flagged keyword detected: "${keyword}"`);
    }
  }

  // 3. Determine Moderation Status
  let status = 'APPROVED';
  if (score > 75) {
    status = 'REJECTED';
  } else if (score >= 50) {
    status = 'PENDING_REVIEW';
  }

  return { score, status, reasons };
};