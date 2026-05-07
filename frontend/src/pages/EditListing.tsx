import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [propertyDetails, setPropertyDetails] = useState({
    title: '',
    description: '',
    price: '',
    propertyType: 'APARTMENT',
    address: '',
    city: '',
    amenities: '',
  });

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/properties/${id}`);
        const data = await res.json();
        if (data.success) {
          const p = data.data;
          setProperty(p);
          setPropertyDetails({
            title: p.title || '',
            description: p.description || '',
            price: p.price || '',
            propertyType: p.propertyType || 'APARTMENT',
            address: p.address || '',
            city: p.city || '',
            amenities: p.amenities?.join(', ') || '',
          });
        } else {
          alert('Failed to load property');
          navigate('/dashboard/agent');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id, navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProperty(false);
  };

  const handleSubmitForReview = async () => {
    await updateProperty(true);
  };

  const updateProperty = async (submitForReview: boolean) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    try {
      const payload = {
        ...propertyDetails,
        amenities: propertyDetails.amenities.split(',').map(a => a.trim()).filter(Boolean),
        submitForReview
      };

      const res = await fetch(`http://localhost:5000/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update property');
      
      alert(submitForReview ? 'Listing submitted for review!' : 'Listing updated successfully!');
      navigate('/dashboard/agent');
    } catch (error: any) {
      alert(`Error updating listing: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="max-w-4xl mx-auto p-6 mt-8 text-center">Loading property details...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
        <p className="text-gray-600">Update the details for your property.</p>
      </div>

      <form className="bg-white p-8 rounded-xl shadow border border-gray-100 space-y-6" onSubmit={handleUpdate}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title</label>
          <input type="text" className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={propertyDetails.title} onChange={e => setPropertyDetails({...propertyDetails, title: e.target.value})} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input type="number" className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={propertyDetails.price} onChange={e => setPropertyDetails({...propertyDetails, price: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={propertyDetails.propertyType} onChange={e => setPropertyDetails({...propertyDetails, propertyType: e.target.value})}>
              <option value="APARTMENT">Apartment</option>
              <option value="VILLA">Villa</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none h-32" value={propertyDetails.description} onChange={e => setPropertyDetails({...propertyDetails, description: e.target.value})} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
          <input type="text" className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Swimming Pool, Gym, Parking" value={propertyDetails.amenities} onChange={e => setPropertyDetails({...propertyDetails, amenities: e.target.value})} />
          <p className="text-xs text-gray-500 mt-1">Enter amenities separated by commas.</p>
        </div>

        <div className="flex gap-4 pt-4 border-t mt-8">
          <button type="button" onClick={() => navigate('/dashboard/agent')} className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded hover:bg-gray-300 transition">Cancel</button>
          
          {(property?.status === 'DRAFT' || property?.status === 'REJECTED') ? (
            <>
              <button type="submit" disabled={isSubmitting} className="bg-gray-500 text-white font-bold py-3 px-6 rounded hover:bg-gray-600 transition disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button type="button" onClick={handleSubmitForReview} disabled={isSubmitting} className="flex-1 bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </>
          ) : (
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Updates'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}