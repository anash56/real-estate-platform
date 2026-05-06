import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries'>('listings');

  // MOCK DATA: Agent's Listings
  const listings = [
    {
      id: 'prop_123',
      title: 'Modern 3BHK Apartment in City Center',
      price: '1,25,00,000',
      status: 'ACTIVE',
      views: 142,
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'prop_126',
      title: 'Luxury Penthouse',
      price: '5,00,00,000',
      status: 'PENDING_REVIEW',
      views: 0,
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'prop_127',
      title: 'Studio Apartment',
      price: '45,00,000',
      status: 'DRAFT',
      views: 0,
      imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'prop_128',
      title: 'Commercial Office Space',
      price: '2,10,00,000',
      status: 'REJECTED',
      flaggedReason: 'Prohibited keyword detected: "casino"',
      views: 0,
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80'
    }
  ];

  // MOCK DATA: Received Inquiries (Privacy Masked)
  const inquiries = [
    {
      id: 'inq_1',
      propertyId: 'prop_123',
      propertyTitle: 'Modern 3BHK Apartment in City Center',
      buyerName: 'Anonymous Buyer',
      buyerEmail: 'Hidden by Platform',
      buyerPhone: 'Hidden by Platform',
      message: 'Hi, I am highly interested in this property. Can we arrange a site visit this Sunday?',
      budget: '1,20,00,000',
      date: 'Oct 24, 2023'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">ACTIVE</span>;
      case 'PENDING_REVIEW': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">IN REVIEW</span>;
      case 'DRAFT': return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">DRAFT</span>;
      case 'REJECTED': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">REJECTED</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
        <Link to="/listings/new" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">
          + Create New Listing
        </Link>
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
          {listings.map(property => (
            <div key={property.id} className="bg-white rounded-xl shadow border overflow-hidden flex flex-col md:flex-row">
              <img src={property.imageUrl} alt={property.title} className="h-48 md:w-64 object-cover" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-gray-900">{property.title}</h3>
                  {getStatusBadge(property.status)}
                </div>
                <p className="text-2xl font-extrabold text-blue-600 mb-4">₹{property.price}</p>
                
                {property.status === 'REJECTED' && (
                  <div className="bg-red-50 text-red-700 p-3 rounded text-sm mb-4 border border-red-100">
                    <strong>Rejection Reason:</strong> {property.flaggedReason}
                  </div>
                )}

                <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm">👁️ {property.views} views</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 rounded font-semibold hover:bg-gray-50 transition">Edit</button>
                    {property.status === 'ACTIVE' && (
                      <Link to={`/property/${property.id}`} className="px-4 py-2 bg-blue-50 text-blue-700 rounded font-semibold hover:bg-blue-100 transition">View Live</Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Received Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6">
          {inquiries.map(inquiry => (
            <div key={inquiry.id} className="bg-white rounded-xl shadow border p-6">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Inquiry for: {inquiry.propertyTitle}</h3>
                  <p className="text-sm text-gray-600 mt-1">From: {inquiry.buyerName} • {inquiry.date}</p>
                  <div className="mt-2 text-sm text-gray-500 space-y-1">
                    <p>📧 {inquiry.buyerEmail}</p>
                    <p>📞 {inquiry.buyerPhone}</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg italic border border-gray-100 mb-4">"{inquiry.message}"</p>
              {inquiry.budget && <p className="text-sm font-semibold text-green-700">💰 Declared Budget: ₹{inquiry.budget}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}