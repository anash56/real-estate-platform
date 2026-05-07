import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries'>('listings');
  const [listings, setListings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Fetch Listings
        const propsRes = await fetch('http://localhost:5000/api/properties/agent', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const propsData = await propsRes.json();
        if (propsData.success) setListings(propsData.data);

        // Fetch Inquiries
        const inqRes = await fetch('http://localhost:5000/api/inquiries/received', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const inqData = await inqRes.json();
        if (inqData.success) setInquiries(inqData.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleRespond = async (inquiryId: string) => {
    if (!responseText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/inquiries/${inquiryId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ response: responseText })
      });
      const data = await res.json();
      
      if (data.success) {
        setInquiries(inquiries.map(inq => inq.id === inquiryId ? { ...inq, status: 'RESPONDED', agentResponse: responseText, respondedAt: new Date().toISOString() } : inq));
        setActiveResponseId(null);
        setResponseText('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to send response');
    }
  };

  const getStatusBadge = (property: any) => {
    if (property.status === 'DRAFT') return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">DRAFT</span>;
    if (property.moderationStatus === 'PENDING_REVIEW') return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">IN REVIEW</span>;
    if (property.moderationStatus === 'REJECTED') return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">REJECTED</span>;
    if (property.status === 'ACTIVE') return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">ACTIVE</span>;
    return null;
  };

  if (isLoading) {
    return <div className="max-w-6xl mx-auto p-6 mt-8 text-center text-gray-600">Loading your dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
        <div className="flex gap-4">
          <Link to="/profile" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold transition border">
            ⚙️ Profile Settings
          </Link>
          <Link to="/listings/new" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">
            + Create New Listing
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8 text-lg font-medium">
        <button 
          onClick={() => setActiveTab('listings')}
          className={`pb-3 px-2 ${activeTab === 'listings' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          My Listings ({listings.length})
        </button>
        <button 
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 px-2 ${activeTab === 'inquiries' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Received Inquiries ({inquiries.length})
        </button>
      </div>

      {/* Tab Content: My Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-6">
          {listings.length === 0 && <p className="text-gray-500">You haven't listed any properties yet.</p>}
          {listings.map(property => {
            const imgUrl = property.images && property.images.length > 0 ? `http://localhost:5000${property.images[0].imageUrl}` : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';
            return (
              <div key={property.id} className="bg-white rounded-xl shadow border overflow-hidden flex flex-col md:flex-row">
                <img src={imgUrl} alt={property.title} className="h-48 md:w-64 object-cover" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-gray-900">{property.title}</h3>
                    {getStatusBadge(property)}
                  </div>
                  <p className="text-2xl font-extrabold text-blue-600 mb-4">₹{property.price}</p>
                  
                  {property.moderationStatus === 'REJECTED' && property.flaggedReasons && property.flaggedReasons.length > 0 && (
                    <div className="bg-red-50 text-red-700 p-3 rounded text-sm mb-4 border border-red-100">
                      <strong>Rejection Reason:</strong> {property.flaggedReasons[0]}
                    </div>
                  )}

                  <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-sm">👁️ {property.viewCount || 0} views</p>
                    <div className="flex gap-2">
                      <Link to={`/listings/edit/${property.id}`} className="px-4 py-2 border border-gray-300 rounded font-semibold hover:bg-gray-50 transition block text-center">Edit</Link>
                      {property.status === 'ACTIVE' && (
                        <Link to={`/property/${property.id}`} className="px-4 py-2 bg-blue-50 text-blue-700 rounded font-semibold hover:bg-blue-100 transition">View Live</Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content: Received Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6">
          {inquiries.length === 0 && <p className="text-gray-500">You have no new inquiries.</p>}
          {inquiries.map(inquiry => (
            <div key={inquiry.id} className="bg-white rounded-xl shadow border p-6">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Inquiry for: {inquiry.property?.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">From: {inquiry.buyer?.fullName} • {new Date(inquiry.createdAt).toLocaleDateString()}</p>
                  <div className="mt-2 text-sm text-gray-500 space-y-1">
                    <p>📧 {inquiry.buyer?.email}</p>
                    <p>📞 {inquiry.buyer?.phone || 'Not provided'}</p>
                  </div>
                  
                  <Link to={`/chat/${inquiry.id}`} className="inline-block mt-3 bg-green-600 text-white text-xs px-4 py-2 rounded font-bold hover:bg-green-700 transition shadow">
                    💬 Open Live Chat
                  </Link>
                </div>
              </div>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg italic border border-gray-100 mb-4">"{inquiry.message}"</p>
              {inquiry.budget && <p className="text-sm font-semibold text-green-700 mb-4">💰 Declared Budget: ₹{inquiry.budget}</p>}

              {inquiry.status === 'RESPONDED' ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-1">Your Response:</p>
                  <p className="text-gray-700">{inquiry.agentResponse}</p>
                </div>
              ) : activeResponseId === inquiry.id ? (
                <div className="mt-4">
                  <textarea className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Type your response here..." value={responseText} onChange={(e) => setResponseText(e.target.value)}></textarea>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleRespond(inquiry.id)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Send Response</button>
                    <button onClick={() => { setActiveResponseId(null); setResponseText(''); }} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveResponseId(inquiry.id)} className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-50">Reply to Inquiry</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}