import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateListing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  // Step 1: Property Details State
  const [propertyDetails, setPropertyDetails] = useState({
    title: '',
    description: '',
    price: '',
    propertyType: 'APARTMENT',
    address: '',
    city: '',
    virtualTourUrl: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Step 2: Document State (Mocked for UI)
  const [documents, setDocuments] = useState<{ type: string; name: string }[]>([]);
  const [docType, setDocType] = useState('TITLE_DEED');

  // Step 3: Defect Disclosure State
  const [disclosures, setDisclosures] = useState({
    hasStructuralIssues: false,
    structuralIssuesDetails: '',
    hasLegalDisputes: false,
    legalDisputesDetails: '',
    agentSignedOff: false,
  });

  const handleGenerateDescription = async () => {
    if (!aiPrompt) return alert('Please enter some bullet points for the AI.');
    setIsGeneratingAi(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/properties/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setPropertyDetails({ ...propertyDetails, description: data.data });
        setShowAiAssistant(false);
        setAiPrompt('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error generating description');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddDocument = () => {
    setDocuments([...documents, { type: docType, name: `mock_document_${Date.now()}.pdf` }]);
  };

  const handleSaveDraft = async () => {
    if (!propertyDetails.title) {
      alert('Please provide at least a title to save a draft.');
      return;
    }
    setIsSavingDraft(true);
    const token = localStorage.getItem('token');

    try {
      // 1. Create Property Record as a DRAFT
      const propertyPayload = {
        title: propertyDetails.title,
        description: propertyDetails.description || 'Description not provided',
        propertyType: propertyDetails.propertyType,
        price: propertyDetails.price || 0,
        address: propertyDetails.address || 'Address not provided',
        city: propertyDetails.city || 'City not provided',
        state: 'State',
        pincode: '000000',
        bedrooms: 1,
        bathrooms: 1,
        area: 1000,
        latitude: 0.0,
        longitude: 0.0,
        amenities: [],
        virtualTourUrl: propertyDetails.virtualTourUrl || null,
        isDraft: true // Set the draft flag to true
      };

      const propRes = await fetch('http://localhost:5000/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(propertyPayload)
      });
      
      const propData = await propRes.json();
      if (!propData.success) throw new Error(propData.error || 'Failed to save draft');
      
      const propertyId = propData.data.property.id;

      // 2. Upload any images that have been selected
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(file => formData.append('images', file));
        await fetch(`http://localhost:5000/api/properties/${propertyId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      alert('Draft saved successfully!');
      navigate('/dashboard/agent');
    } catch (error: any) {
      alert(`Error saving draft: ${error.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclosures.agentSignedOff) {
      alert('You must sign off on the defect disclosures to proceed.');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    try {
      // 1. Create Property Record
      const propertyPayload = {
        title: propertyDetails.title,
        description: propertyDetails.description || 'Description not provided',
        propertyType: propertyDetails.propertyType,
        price: propertyDetails.price || 0,
        address: propertyDetails.address || 'Address not provided',
        city: propertyDetails.city || 'City not provided',
        // Mock data for missing fields required by the database schema
        state: 'State',
        pincode: '000000',
        bedrooms: 1,
        bathrooms: 1,
        area: 1000,
        latitude: 0.0,
        longitude: 0.0,
        amenities: [],
        virtualTourUrl: propertyDetails.virtualTourUrl || null,
        isDraft: false
      };

      const propRes = await fetch('http://localhost:5000/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(propertyPayload)
      });
      
      const propData = await propRes.json();
      if (!propData.success) throw new Error(propData.error || 'Failed to create property');
      
      const propertyId = propData.data.property.id;

      // 2. Upload Images
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(file => formData.append('images', file));
        await fetch(`http://localhost:5000/api/properties/${propertyId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }, // Note: Browser automatically sets Content-Type boundary
          body: formData
        });
      }

      // 3. Upload Legal Documents (Mocking the URLs for now)
      for (const doc of documents) {
        await fetch(`http://localhost:5000/api/documents/${propertyId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ documentType: doc.type, documentUrl: `https://fake-storage.com/${doc.name}` })
        });
      }

      // 4. Submit Defect Disclosure
      await fetch(`http://localhost:5000/api/defects/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...disclosures, hasPreviousDamage: false, hasEnvironmentalHazards: false })
      });

      alert('Listing created successfully! Auto-moderation has been applied.');
      navigate('/dashboard/agent');
    } catch (error: any) {
      console.error(error);
      alert(`Error submitting listing: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
        <p className="text-gray-600">Complete all steps to list your property securely.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center mb-8">
        <div className={`flex-1 h-2 rounded-l ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex-1 h-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex-1 h-2 rounded-r ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      </div>
      <div className="flex justify-between text-sm font-bold text-gray-500 mb-8">
        <span className={step >= 1 ? 'text-blue-600' : ''}>1. Basic Details</span>
        <span className={step >= 2 ? 'text-blue-600' : ''}>2. Legal Documents</span>
        <span className={step >= 3 ? 'text-blue-600' : ''}>3. Disclosures</span>
      </div>

      <div className="bg-white p-8 rounded-xl shadow border border-gray-100">
        {/* STEP 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-2">Property Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title</label>
              <input 
                type="text" 
                className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="e.g. Modern 3BHK in Downtown"
                value={propertyDetails.title}
                onChange={e => setPropertyDetails({...propertyDetails, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={propertyDetails.price}
                  onChange={e => setPropertyDetails({...propertyDetails, price: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select 
                  className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={propertyDetails.propertyType}
                  onChange={e => setPropertyDetails({...propertyDetails, propertyType: e.target.value})}
                >
                  <option value="APARTMENT">Apartment</option>
                  <option value="VILLA">Villa</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input 
                  type="text" 
                  className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={propertyDetails.city}
                  onChange={e => setPropertyDetails({...propertyDetails, city: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <input 
                  type="text" 
                  className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={propertyDetails.address}
                  onChange={e => setPropertyDetails({...propertyDetails, address: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Virtual 3D Tour URL (Optional)</label>
              <input 
                type="url" 
                className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="e.g. https://my.matterport.com/show/?m=..."
                value={propertyDetails.virtualTourUrl}
                onChange={e => setPropertyDetails({...propertyDetails, virtualTourUrl: e.target.value})}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Property Description</label>
                <button type="button" onClick={() => setShowAiAssistant(!showAiAssistant)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded-full font-bold flex items-center gap-1 transition">
                  ✨ Write with AI
                </button>
              </div>
              
              {showAiAssistant && (
                <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <label className="block text-xs font-bold text-purple-800 mb-2">AI Listing Assistant</label>
                  <textarea className="w-full border border-purple-300 p-2 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" rows={2} placeholder="e.g., 3 bed, 2 bath, sea facing, newly renovated kitchen, close to metro..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}></textarea>
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingAi} className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50">
                      {isGeneratingAi ? 'Generating Magic...' : 'Generate Description'}
                    </button>
                  </div>
                </div>
              )}
              <textarea className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none h-32" value={propertyDetails.description} onChange={e => setPropertyDetails({...propertyDetails, description: e.target.value})} required></textarea>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Images</label>
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={e => setImageFiles(Array.from(e.target.files || []))}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Upload up to 10 images. The first image will be the cover photo.</p>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition mt-4"
            >
              Next Step: Upload Documents ➔
            </button>
          </div>
        )}

        {/* STEP 2: Document Uploads */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded text-blue-800 border border-blue-200">
              <strong>🛡️ Verification Required:</strong> You must upload legal documents (like a Title Deed) before this property goes live. Our admins will verify them.
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
              <div className="flex flex-col items-center gap-4">
                <select 
                  className="border p-2 rounded w-64 bg-white"
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                >
                  <option value="TITLE_DEED">Title Deed</option>
                  <option value="TAX_RECEIPT">Tax Receipt</option>
                  <option value="NOC">NOC</option>
                </select>
                <button onClick={handleAddDocument} className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-semibold hover:bg-gray-300">
                  + Select & Upload File (Mock)
                </button>
              </div>
            </div>

            {documents.length > 0 && (
              <ul className="space-y-2 mt-4">
                {documents.map((doc, idx) => (
                  <li key={idx} className="bg-green-50 text-green-800 p-3 rounded flex justify-between border border-green-200">
                    <span>📄 {doc.type}</span>
                    <span className="text-sm">{doc.name}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(1)} className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded hover:bg-gray-300 transition">
                ⬅ Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition">
                Next Step: Disclosures ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Defect Disclosures */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-orange-50 p-4 rounded text-orange-800 border border-orange-200">
              <strong>⚠️ Mandatory Disclosure:</strong> Hiding known defects violates platform terms and can lead to a permanent ban.
            </div>

            {/* Structural Issues */}
            <div className="border p-4 rounded">
              <label className="flex items-center gap-2 font-bold mb-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-orange-600"
                  checked={disclosures.hasStructuralIssues}
                  onChange={e => setDisclosures({...disclosures, hasStructuralIssues: e.target.checked})}
                />
                Are there any known structural issues?
              </label>
              {disclosures.hasStructuralIssues && (
                <textarea 
                  className="w-full border p-2 rounded mt-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" 
                  placeholder="Please describe the structural issues..."
                  value={disclosures.structuralIssuesDetails}
                  onChange={e => setDisclosures({...disclosures, structuralIssuesDetails: e.target.value})}
                  required
                />
              )}
            </div>

            {/* Agent Sign-off */}
            <div className="bg-gray-50 border p-4 rounded mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-6 h-6 mt-1"
                  checked={disclosures.agentSignedOff}
                  onChange={e => setDisclosures({...disclosures, agentSignedOff: e.target.checked})}
                  required
                />
                <span className="text-sm text-gray-700">
                  <strong>Agent Legal Sign-off:</strong> I confirm that the information provided is accurate to the best of my knowledge. I understand that fraudulent listings will be removed.
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4 border-t mt-8">
              <button type="button" onClick={() => setStep(2)} className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded hover:bg-gray-300 transition">
                ⬅ Back
              </button>
              <button 
                type="button" 
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="bg-gray-500 text-white font-bold py-3 px-6 rounded hover:bg-gray-600 transition disabled:opacity-50"
              >
                {isSavingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="submit" 
                disabled={!disclosures.agentSignedOff || isSubmitting || isSavingDraft}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting to Moderation Queue...' : 'Submit Listing for Review ✅'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}