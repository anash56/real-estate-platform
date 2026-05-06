import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  // MOCK DATA: Featured properties with ethical badges
  const featuredProperties = [
    {
      id: 'prop_123',
      title: 'Modern 3BHK Apartment in City Center',
      price: '1,25,00,000',
      address: 'Downtown, Mumbai',
      beds: 3,
      baths: 2,
      area: 1500,
      badges: { isVerified: true, hasDisclosure: true },
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'prop_124',
      title: 'Spacious 4BHK Villa with Garden',
      price: '3,50,00,000',
      address: 'Koramangala, Bangalore',
      beds: 4,
      baths: 4,
      area: 3200,
      badges: { isVerified: true, hasDisclosure: false },
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'prop_125',
      title: 'Cozy 2BHK Near Tech Park',
      price: '85,00,000',
      address: 'Hitec City, Bangalore',
      beds: 2,
      baths: 2,
      area: 1100,
      badges: { isVerified: true, hasDisclosure: true },
      imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Search functionality will be wired up later! You searched for: ${searchQuery}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-900 text-white py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-6">
            Find Your Dream Home with 100% Transparency
          </h1>
          <p className="text-xl text-blue-200 mb-10">
            Every property is verified. Every defect is disclosed. No hidden surprises.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="bg-white p-2 rounded-full shadow-lg flex max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Search by city, neighborhood, or property type..."
              className="flex-1 px-6 py-3 text-gray-800 rounded-l-full focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="bg-white py-8 border-b">
        <div className="max-w-6xl mx-auto flex justify-center gap-12 text-center px-6">
          <div>
            <div className="text-3xl mb-2">🛡️</div>
            <h3 className="font-bold text-gray-800">Verified Legal Docs</h3>
          </div>
          <div>
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-bold text-gray-800">Mandatory Disclosures</h3>
          </div>
          <div>
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-gray-800">Buyer Privacy</h3>
          </div>
        </div>
      </div>

      {/* Featured Properties Grid */}
      <div className="max-w-6xl mx-auto py-16 px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Verified Properties</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProperties.map((property) => (
            <Link to={`/property/${property.id}`} key={property.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition block group">
              {/* Property Image */}
              <div className="h-56 overflow-hidden relative">
                <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                
                {/* Floating Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {property.badges.isVerified && (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      ✓ Verified Docs
                    </span>
                  )}
                  {property.badges.hasDisclosure && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      ✓ Disclosure Signed
                    </span>
                  )}
                </div>
              </div>

              {/* Property Details */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{property.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{property.address}</p>
                
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-2xl font-extrabold text-blue-600">₹{property.price}</p>
                  <div className="text-gray-600 text-sm font-medium">
                    {property.beds} Bed • {property.baths} Bath
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}