import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperties = async (query = '') => {
    setIsLoading(true);
    try {
      const url = query 
        ? `http://localhost:5000/api/properties?search=${encodeURIComponent(query)}` 
        : 'http://localhost:5000/api/properties';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setProperties(data.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(searchQuery);
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
        
        {isLoading ? (
          <div className="text-center text-gray-500 py-10">Loading latest properties...</div>
        ) : properties.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No verified properties found yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
            <Link to={`/property/${property.id}`} key={property.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition block group">
              {/* Property Image */}
              <div className="h-56 overflow-hidden relative">
                <img src={property.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                
                {/* Floating Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {property.legalDocuments && property.legalDocuments.length > 0 && (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      ✓ Verified Docs
                    </span>
                  )}
                  {property.defectDisclosure?.agentSignedOff && (
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
                    {property.bedrooms} Bed • {property.bathrooms} Bath
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}