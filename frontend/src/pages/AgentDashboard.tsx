import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// @ts-ignore
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries' | 'tours' | 'analytics' | 'reviews'>('analytics');
  const [listings, setListings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
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

        // Fetch Tour Requests
        const tourRes = await fetch('http://localhost:5000/api/tours/agent', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tourData = await tourRes.json();
        if (tourData.success) setTours(tourData.data);

        // Fetch Reviews
        const revsRes = await fetch('http://localhost:5000/api/properties/agent/reviews', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const revsData = await revsRes.json();
        if (revsData.success) setReviews(revsData.data);

        // Fetch Analytics
        const analyticsRes = await fetch('http://localhost:5000/api/properties/agent/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) setAnalytics(analyticsData.data);
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

  const handleTourStatus = async (tourId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/tours/${tourId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setTours(tours.map(t => t.id === tourId ? { ...t, status } : t));
      } else {
        alert(data.error);
      }
    } catch (err) { alert('Failed to update tour status'); }
  };

  const handleReplyReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/properties/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText })
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, agentReply: replyText, repliedAt: new Date().toISOString() } : r));
        setActiveReplyId(null);
        setReplyText('');
      } else alert(data.error);
    } catch (err) { alert('Error replying to review'); }
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
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-2 ${activeTab === 'analytics' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Performance Analytics
        </button>
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
        <button 
          onClick={() => setActiveTab('tours')}
          className={`pb-3 px-2 ${activeTab === 'tours' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tour Requests ({tours.filter(t => t.status === 'PENDING').length})
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-2 ${activeTab === 'reviews' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Content: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8 animate-fade-in">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-blue-600">
              <p className="text-gray-500 text-sm font-semibold uppercase">Total Views</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.summary.totalViews.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-red-500">
              <p className="text-gray-500 text-sm font-semibold uppercase">Total Favorites</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.summary.totalFavorites.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-semibold uppercase">Total Inquiries</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.summary.totalInquiries.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-semibold uppercase">Active Listings</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.summary.totalListings.toLocaleString()}</p>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">6-Month Trend Analysis</h3>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="Views" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Favorites" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Inquiries" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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

      {/* Tab Content: Tour Requests */}
      {activeTab === 'tours' && (
        <div className="space-y-6">
          {tours.length === 0 && <p className="text-gray-500">No tour requests received yet.</p>}
          {tours.map(tour => (
            <div key={tour.id} className={`bg-white rounded-xl shadow border p-6 flex flex-col lg:flex-row justify-between gap-6 ${tour.status === 'PENDING' ? 'border-l-4 border-l-yellow-400' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg text-gray-900">Tour Request: {tour.property?.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${tour.status === 'APPROVED' ? 'bg-green-100 text-green-800' : tour.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{tour.status}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">From: <strong>{tour.buyer?.fullName}</strong> • 📧 {tour.buyer?.email} • 📞 {tour.buyer?.phone || 'N/A'}</p>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 inline-block">
                  <p className="text-sm text-gray-500 uppercase font-bold mb-1">Requested Date</p>
                  <p className="text-xl font-extrabold text-blue-600">{new Date(tour.date).toLocaleDateString()}</p>
                </div>
                
                {tour.message && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-900">
                    <strong>Buyer Note:</strong> "{tour.message}"
                  </div>
                )}
              </div>
              
              {tour.status === 'PENDING' && (
                <div className="flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6 shrink-0 lg:w-48">
                  <button onClick={() => handleTourStatus(tour.id, 'APPROVED')} className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 transition shadow">
                    Approve Tour
                  </button>
                  <button onClick={() => handleTourStatus(tour.id, 'REJECTED')} className="w-full bg-red-100 text-red-700 font-bold py-2 rounded hover:bg-red-200 transition">
                    Decline / Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {reviews.length === 0 && <p className="text-gray-500">No reviews on your properties yet.</p>}
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl shadow border p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{review.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">On: <strong>{review.property?.title}</strong> • By: {review.reviewer?.fullName}</p>
                </div>
                <div className="flex text-yellow-400 text-lg">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
              </div>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg italic border border-gray-100 mb-4">"{review.description}"</p>

              {review.agentReply ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-1">Your Public Reply:</p>
                  <p className="text-gray-700">{review.agentReply}</p>
                </div>
              ) : activeReplyId === review.id ? (
                <div className="mt-4">
                  <textarea className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Type your public reply here..." value={replyText} onChange={(e) => setReplyText(e.target.value)}></textarea>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleReplyReview(review.id)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Post Reply</button>
                    <button onClick={() => { setActiveReplyId(null); setReplyText(''); }} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveReplyId(review.id)} className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-50">Write Public Reply</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}