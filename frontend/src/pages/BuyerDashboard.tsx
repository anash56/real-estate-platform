import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
  const [activeTab, setActiveTab] = useState<'saved' | 'inquiries'>('saved');
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuyerData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Fetch Sent Inquiries
        const inqRes = await fetch('http://localhost:5000/api/inquiries/sent', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const inqData = await inqRes.json();
        if (inqData.success) setInquiries(inqData.data);

        // Fetch Saved Properties (Assuming endpoint /api/properties/favorites)
        const favRes = await fetch('http://localhost:5000/api/properties/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (favRes.ok) {
          const favData = await favRes.json();
          if (favData.success) setSavedProperties(favData.data);
        }
      } catch (error) {
        console.error('Failed to fetch buyer dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuyerData();
  }, [navigate]);

  const handleRevealContactInfo = async (inquiryId: string) => {
    if (!window.confirm('Are you sure you want to reveal your email and phone number to this agent?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/inquiries/${inquiryId}/reveal`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setInquiries(inquiries.map(inq => inq.id === inquiryId ? { ...inq, buyerEmailHidden: false, buyerPhoneHidden: false } : inq));
      } else {
        alert(data.error || 'Failed to reveal contact info');
      }
    } catch (error) {
      alert('Network error while revealing contact info');
    }
  };

  if (isLoading) return <div className="max-w-6xl mx-auto p-6 mt-8 text-center text-gray-600">Loading your dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8 text-lg font-medium">
        <button 
          onClick={() => setActiveTab('saved')}
          className={`pb-3 px-2 ${activeTab === 'saved' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Saved Properties ({savedProperties.length})
        </button>
        <button 
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 px-2 ${activeTab === 'inquiries' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          My Inquiries ({inquiries.length})
        </button>
      </div>

      {/* Tab Content: Saved Properties */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProperties.length === 0 ? (
            <p className="text-gray-500 col-span-full">You haven't saved any properties yet.</p>
          ) : (
            savedProperties.map(property => (
              <div key={property.id} className="bg-white rounded-xl shadow border overflow-hidden flex flex-col">
                <img src={property.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'} alt={property.title} className="h-48 object-cover w-full" />
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{property.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{property.address}</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-auto mb-4">₹{property.price}</p>
                  <div className="flex gap-2 mt-auto">
                    <Link to={`/property/${property.id}`} className="flex-1 bg-gray-100 text-center py-2 rounded font-semibold hover:bg-gray-200 transition">
                      View Details
                    </Link>
                    <button className="px-4 border border-red-200 text-red-500 rounded hover:bg-red-50 transition">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: My Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6">
          {inquiries.length === 0 ? (
            <p className="text-gray-500">You haven't sent any inquiries yet.</p>
          ) : (
            inquiries.map(inquiry => (
              <div key={inquiry.id} className="bg-white rounded-xl shadow border p-6">
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      <Link to={`/property/${inquiry.propertyId}`} className="hover:text-blue-600 underline decoration-blue-300">
                        {inquiry.property?.title || 'Unknown Property'}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Sent to: {inquiry.property?.agent?.fullName || 'Agent'} • {new Date(inquiry.createdAt).toLocaleDateString()}</p>
                  </div>
                  {inquiry.buyerEmailHidden ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-green-200">
                        🛡️ Contact Info Hidden
                      </span>
                      <button 
                        onClick={() => handleRevealContactInfo(inquiry.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold transition"
                      >
                        Reveal my contact info
                      </button>
                    </div>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-blue-200">
                      ✅ Contact Info Revealed
                    </span>
                  )}
                </div>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg italic border border-gray-100">
                  "{inquiry.message}"
                </p>
                {inquiry.agentResponse && (
                  <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 mb-1">Agent's Response:</p>
                    <p className="text-gray-700">{inquiry.agentResponse}</p>
                    {inquiry.respondedAt && <p className="text-xs text-gray-500 mt-2">{new Date(inquiry.respondedAt).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}