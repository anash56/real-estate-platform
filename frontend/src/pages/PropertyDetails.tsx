import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inquiryText, setInquiryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/properties/${id}`);
        const data = await res.json();
        if (data.success) {
          setProperty(data.data);
        } else {
          setError(data.error || 'Failed to load property');
        }
      } catch (err) {
        setError('Network error occurred while fetching property');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to send an inquiry.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch(`http://localhost:5000/api/inquiries/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: inquiryText })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Inquiry sent securely! Your contact information has been hidden from the agent to protect your privacy.');
        setInquiryText('');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Network error while sending inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="max-w-6xl mx-auto p-6 mt-8 text-center text-gray-600">Loading property details...</div>;
  if (error || !property) return <div className="max-w-6xl mx-auto p-6 mt-8 text-center text-red-600">{error || 'Property not found'}</div>;

  const isVerified = property.legalDocuments && property.legalDocuments.length > 0;
  const hasDefectDisclosure = property.defectDisclosure?.agentSignedOff;

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
          <p className="text-lg text-gray-600">{property.address}, {property.city}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-blue-600">₹ {property.price}</p>
        </div>
      </div>

      {/* Verification Badges (Ethical Platform Feature) */}
      <div className="flex gap-4 mb-8">
        {isVerified && (
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-md font-semibold flex items-center gap-2 border border-green-200">
            ✅ Legal Documents Verified
          </span>
        )}
        {hasDefectDisclosure && (
          <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md font-semibold flex items-center gap-2 border border-blue-200">
            📝 Agent Defect Disclosure Signed
          </span>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Disclosures */}
        <div className="md:col-span-2 space-y-8">
          {/* Image Placeholder */}
          <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
            [Property Image Gallery Placeholder]
          </div>

          {/* Basic Details */}
          <div className="flex gap-8 py-4 border-y border-gray-200">
            <div className="text-center"><span className="block text-2xl font-bold">{property.bedrooms}</span> Beds</div>
            <div className="text-center"><span className="block text-2xl font-bold">{property.bathrooms}</span> Baths</div>
            <div className="text-center"><span className="block text-2xl font-bold">{property.area}</span> sq.ft.</div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-2xl font-bold mb-4">About this property</h2>
            <p className="text-gray-700 leading-relaxed">{property.description}</p>
          </div>

          {/* Defect Disclosure Section (Ethical Platform Feature) */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-orange-800 mb-4">Mandatory Defect Disclosure</h2>
            <p className="text-sm text-orange-700 mb-4">The agent has legally declared the following about this property:</p>
            
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span>Structural Issues:</span>
                <span className="font-bold">{property.defectDisclosure?.hasStructuralIssues ? '⚠️ Yes' : '✅ None'}</span>
              </li>
              <li className="flex justify-between">
                <span>Legal Disputes:</span>
                <span className="font-bold">{property.defectDisclosure?.hasLegalDisputes ? '⚠️ Yes' : '✅ None'}</span>
              </li>
              <li className="flex justify-between border-t border-orange-200 pt-2 mt-2">
                <span>Previous Damage:</span>
                <span className="font-bold">{property.defectDisclosure?.hasPreviousDamage ? '⚠️ Yes' : '✅ None'}</span>
              </li>
              {property.defectDisclosure?.hasPreviousDamage && (
                <li className="text-sm text-gray-600 bg-white p-3 rounded mt-1">
                  <span className="font-semibold block">Agent Details:</span> 
                  {property.defectDisclosure?.previousDamageDetails}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Right Column: Agent & Inquiry Form */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-6">
            <h3 className="text-xl font-bold mb-2">Interested?</h3>
            <p className="text-gray-600 mb-6">Contact the agent securely.</p>

            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-3 h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="I'm interested in this property..."
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex gap-2">
                <span>🛡️</span>
                <p><strong>Privacy Protected:</strong> Your email and phone number will be hidden from the agent until you choose to reveal them.</p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Secure Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}