import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'properties' | 'reviews' | 'users' | 'disputes'>('analytics');
  const [queue, setQueue] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
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

        // Fetch Users
        const usersRes = await fetch('http://localhost:5000/api/moderation/users', { headers: { Authorization: `Bearer ${token}` } });
        const usersData = await usersRes.json();
        if (usersData.success) setUsers(usersData.data);

        // Fetch Disputes
        const disputesRes = await fetch('http://localhost:5000/api/moderation/disputes', { headers: { Authorization: `Bearer ${token}` } });
        const disputesData = await disputesRes.json();
        if (disputesData.success) setDisputes(disputesData.data);

        // Fetch Analytics
        const analyticsRes = await fetch('http://localhost:5000/api/moderation/analytics', { headers: { Authorization: `Bearer ${token}` } });
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) setAnalytics(analyticsData.data);
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

  const handleVerifyDocument = async (propertyId: string, documentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/documents/${documentId}/verify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQueue(queue.map(p => {
          if (p.id === propertyId) {
            return {
              ...p,
              legalDocuments: p.legalDocuments.map((d: any) => d.id === documentId ? { ...d, isVerified: !d.isVerified } : d)
            };
          }
          return p;
        }));
      } else alert(data.error);
    } catch (err) {
      alert('Error verifying document');
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

  const handleVerifyAgentId = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/users/${userId}/verify-id`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQueue(queue.map(p => p.agent?.id === userId ? { ...p, agent: { ...p.agent, idVerified: true } } : p));
        alert('Agent ID verified successfully!');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error verifying agent ID');
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

  const handleToggleUserSuspension = async (userId: string) => {
    if (!window.confirm('Are you sure you want to change this user\'s suspension status?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/users/${userId}/suspend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, isSuspended: !u.isSuspended } : u));
      } else alert(data.error);
    } catch (err) { alert('Error updating user'); }
  };

  const handleResolveDispute = async (disputeId: string, status: string) => {
    const adminNotes = prompt('Enter your resolution notes (internal/visible to parties):');
    if (adminNotes === null) return; // Cancelled
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/moderation/disputes/${disputeId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNotes })
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(disputes.map(d => d.id === disputeId ? { ...d, status, adminNotes } : d));
      } else alert(data.error);
    } catch (err) { alert('Error resolving dispute'); }
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
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-2 ${activeTab === 'analytics' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Platform Analytics
        </button>
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
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 ${activeTab === 'users' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Users ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 px-2 ${activeTab === 'disputes' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Disputes ({disputes.filter(d => d.status === 'OPEN').length})
        </button>
      </div>

      {/* Tab Content: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Total Users</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.users.total}</p>
              <p className="text-xs text-red-500 mt-2 font-semibold">{analytics.users.suspended} Suspended</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Active Properties</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.properties.active}</p>
              <p className="text-xs text-yellow-600 mt-2 font-semibold">{analytics.properties.pending} Pending Review</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Open Disputes</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.disputes.open}</p>
              <p className="text-xs text-gray-500 mt-2 font-semibold">{analytics.disputes.total} Total Lifetime</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Total Inquiries</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.inquiries.total}</p>
              <p className="text-xs text-gray-500 mt-2 font-semibold">Messages exchanged</p>
            </div>
          </div>
        </div>
      )}

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
                    
                    <div className="mt-3 p-3 bg-gray-50 border rounded-lg text-sm inline-block">
                      <p className="font-semibold mb-1 text-gray-700">Agent Verification Status:</p>
                      {property.agent?.idVerified ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">✅ Identity Verified</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <span className="text-red-600 font-bold flex items-center gap-1">❌ Not Verified</span>
                          {property.agent?.governmentId ? (
                            <div className="flex items-center gap-3 mt-1">
                              <a href={`http://localhost:5000${property.agent.governmentId}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold text-xs border border-blue-200 px-2 py-1 rounded bg-white shadow-sm">🔍 View ID</a>
                              <button onClick={() => handleVerifyAgentId(property.agent.id)} className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-bold hover:bg-green-200 border border-green-200 shadow-sm transition">✅ Verify Agent Now</button>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic mt-1 block">No ID uploaded by agent yet</span>
                          )}
                        </div>
                      )}
                    </div>
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
                    <p className="mb-3">Agent Signed Off: {property.defectDisclosure?.agentSignedOff ? '✅ Yes' : '❌ No'}</p>
                    
                    <div className="mt-2">
                      {property.legalDocuments && property.legalDocuments.length > 0 ? (
                        <ul className="space-y-2">
                          {property.legalDocuments.map((doc: any) => (
                            <li key={doc.id} className="flex justify-between items-center bg-white p-2 rounded border text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{doc.documentType}</span>
                                <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">(View)</a>
                              </div>
                              <button onClick={() => handleVerifyDocument(property.id, doc.id)} className={`px-2 py-1 rounded transition-colors ${doc.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                                {doc.isVerified ? '✅ Verified' : 'Verify'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-red-500 text-xs">No documents uploaded.</p>}
                    </div>
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
                    <button 
                      onClick={() => handleApprove(property.id)} 
                      disabled={!property.agent?.idVerified}
                      className={`px-6 py-2 rounded shadow font-semibold transition ${property.agent?.idVerified ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      title={!property.agent?.idVerified ? 'Agent must be verified first' : ''}
                    >
                      {!property.agent?.idVerified ? '⚠️ Identity Verification Required' : 'Approve Property'}
                    </button>
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

      {/* Tab Content: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Name & Email</th>
                <th className="p-4 font-semibold text-gray-600">Role</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-bold text-gray-900">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{user.role}</span></td>
                  <td className="p-4">
                    {user.isSuspended ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">SUSPENDED</span> : <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>}
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleToggleUserSuspension(user.id)} className={`px-3 py-1 rounded text-xs font-bold transition ${user.isSuspended ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                      {user.isSuspended ? 'Restore Access' : 'Suspend User'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          {disputes.length === 0 && <p className="text-gray-500 text-center p-8 bg-white shadow rounded-lg">No active disputes.</p>}
          {disputes.map(dispute => (
            <div key={dispute.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${dispute.status === 'OPEN' ? 'border-red-500' : 'border-gray-300'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">Dispute <span>#{dispute.id.slice(-6)}</span></h3>
                  <p className="text-sm text-gray-600 mt-1">Property: <span className="font-semibold">{dispute.property?.title || 'General Account Dispute'}</span></p>
                  <p className="text-sm text-gray-600 mt-1">Reported by: <strong>{dispute.buyer?.fullName}</strong> vs. Agent: <strong>{dispute.agent?.fullName}</strong></p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold ${dispute.status === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'}`}>{dispute.status}</span>
              </div>
              <div className="bg-red-50 text-red-900 p-4 rounded border border-red-100 italic mb-4">"{dispute.reason}"</div>
              
              {dispute.adminNotes && <div className="bg-blue-50 text-blue-900 p-4 rounded border border-blue-100 mb-4"><strong className="block mb-1">Admin Notes/Resolution:</strong>{dispute.adminNotes}</div>}
              
              {dispute.status === 'OPEN' && (
                <div className="flex gap-3 pt-2 border-t">
                  <button onClick={() => handleResolveDispute(dispute.id, 'RESOLVED')} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 shadow-sm text-sm">Mark Resolved</button>
                  <button onClick={() => handleResolveDispute(dispute.id, 'DISMISSED')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300 shadow-sm text-sm">Dismiss Claim</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}