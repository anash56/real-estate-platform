import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState<'properties' | 'reviews'>('properties');
  const [queue, setQueue] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole');
      
      if (!token || role !== 'ADMIN') {
        navigate('/login');
        return;
      }

      try {
        // Fetch property moderation queue
        const propRes = await fetch('http://localhost:5000/api/moderation/queue', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const propData = await propRes.json();
        if (propData.success) setQueue(propData.data);

        // Fetch all reviews for moderation
        const revRes = await fetch('http://localhost:5000/api/moderation/reviews', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const revData = await revRes.json();
        if (revData.success) {
          setReviews(revData.data);
        } else {
          setError(revData.error || 'Failed to load queue');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [navigate]);

  const handleApprove = async (propertyId: string) => {
    if (!window.confirm('Approve this property? It will become active immediately.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/${propertyId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setQueue(queue.filter(p => p.id !== propertyId));
        alert('Property approved.');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error approving property');
    }
  };

  const handleReject = async (propertyId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/${propertyId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      
      if (data.success) {
        setQueue(queue.filter(p => p.id !== propertyId));
        setRejectingId(null);
        setRejectReason('');
        alert('Property rejected.');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error rejecting property');
    }
  };

  const handleToggleReviewStatus = async (reviewId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/reviews/${reviewId}/toggle-approval`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, isApproved: !r.isApproved } : r));
      } else alert(data.error);
    } catch (err) {
      alert('Error updating review status');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.filter(r => r.id !== reviewId));
      } else alert(data.error);
    } catch (err) {
      alert('Error deleting review');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-600">Loading moderation queue...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen mt-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Moderation Queue</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8 text-lg font-medium">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`pb-3 px-2 ${activeTab === 'properties' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pending Properties ({queue.length})
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-2 ${activeTab === 'reviews' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Content: Properties */}
      {activeTab === 'properties' && (
        queue.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-lg shadow text-gray-500">
            Hooray! The property moderation queue is empty.
          </div>
        ) : (
          <div className="space-y-6">
            {queue.map(property => (
              <div key={property.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-400">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{property.title}</h2>
                    <p className="text-gray-600">{property.address}, {property.city}</p>
                    <p className="text-sm font-medium text-gray-500 mt-1">Listed by: {property.agent?.fullName} ({property.agent?.email})</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold px-3 py-1 rounded ${property.riskScore > 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      Risk Score: {property.riskScore}/100
                    </div>
                    <p className="text-lg font-bold text-gray-800 mt-2">₹{property.price}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-semibold text-gray-700 mb-2">Auto-Flagging Reasons:</h4>
                    {property.flaggedReasons && property.flaggedReasons.length > 0 ? (
                      <ul className="list-disc pl-5 text-red-600">{property.flaggedReasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
                    ) : <p className="text-green-600">No flags detected.</p>}
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-semibold text-gray-700 mb-2">Documents & Disclosures:</h4>
                    <p>Documents Uploaded: <span className="font-bold">{property.legalDocuments?.length || 0}</span></p>
                    <p>Agent Signed Off: {property.defectDisclosure?.agentSignedOff ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>

                {rejectingId === property.id ? (
                  <div className="bg-red-50 p-4 rounded border border-red-200 mt-4 flex gap-2">
                    <input type="text" placeholder="Enter reason for rejection..." className="flex-1 border p-2 rounded" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <button onClick={() => handleReject(property.id)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Confirm Reject</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-4 mt-4 border-t pt-4">
                    <button onClick={() => handleApprove(property.id)} className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 font-semibold transition">Approve Property</button>
                    <button onClick={() => setRejectingId(property.id)} className="bg-red-100 text-red-700 px-6 py-2 rounded shadow hover:bg-red-200 font-semibold transition">Reject Property</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab Content: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {reviews.length === 0 && <div className="text-center p-12 bg-white rounded-lg shadow text-gray-500">No reviews have been posted yet.</div>}
          {reviews.map(review => (
            <div key={review.id} className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${review.isApproved ? 'border-green-400' : 'border-red-400 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{review.title}</h2>
                  <p className="text-gray-600">Property: <span className="font-semibold">{review.property?.title}</span></p>
                  <p className="text-sm font-medium text-gray-500 mt-1">Reviewer: {review.reviewer?.fullName} ({review.reviewer?.email})</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-500">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold mt-2 inline-block ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {review.isApproved ? 'PUBLIC (APPROVED)' : 'HIDDEN (BANNED)'}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded border mb-4">{review.description}</p>
              <div className="flex gap-4 border-t pt-4">
                <button onClick={() => handleToggleReviewStatus(review.id)} className={`px-4 py-2 rounded font-semibold transition ${review.isApproved ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {review.isApproved ? 'Ban / Hide Review' : 'Restore / Approve Review'}
                </button>
                <button onClick={() => handleDeleteReview(review.id)} className="bg-red-100 text-red-700 px-4 py-2 rounded font-semibold hover:bg-red-200 transition">
                  Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}