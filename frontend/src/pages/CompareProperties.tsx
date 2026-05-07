import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function CompareProperties() {
  const location = useLocation();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComparison = async () => {
      const params = new URLSearchParams(location.search);
      const ids = params.get('ids');
      
      if (!ids) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/properties/compare?ids=${ids}`);
        const data = await res.json();
        if (data.success) {
          setProperties(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch properties for comparison');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [location.search]);

  if (isLoading) return <div className="p-12 text-center text-blue-600 font-bold animate-pulse">Loading comparison...</div>;
  
  if (properties.length === 0) return (
    <div className="max-w-4xl mx-auto p-12 text-center mt-12 bg-white rounded-xl shadow border">
      <h2 className="text-2xl font-bold mb-4">No properties selected</h2>
      <Link to="/search" className="text-blue-600 font-bold hover:underline">Return to Search</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 mt-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compare Properties</h1>
          <p className="text-gray-600">Side-by-side analysis of your top choices.</p>
        </div>
        <Link to="/search" className="bg-gray-100 text-gray-800 px-6 py-2 rounded-lg font-bold border hover:bg-gray-200 transition">
          ⬅ Back to Search
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <tbody>
            {/* Property Overview row */}
            <tr>
              <th className="p-6 border-b border-r bg-gray-50 w-48 text-gray-500 uppercase text-xs tracking-wider">Property</th>
              {properties.map(p => {
                const imgUrl = p.images && p.images.length > 0 ? `http://localhost:5000${p.images[0].imageUrl}` : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';
                return (
                  <td key={p.id} className="p-6 border-b align-top w-1/3">
                    <div className="h-40 rounded-lg overflow-hidden mb-4"><img src={imgUrl} alt={p.title} className="w-full h-full object-cover" /></div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{p.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{p.city}, {p.address}</p>
                    <Link to={`/property/${p.id}`} className="block text-center bg-blue-50 text-blue-700 py-2 rounded font-bold hover:bg-blue-100 transition">View Full Details</Link>
                  </td>
                );
              })}
            </tr>

            {/* Core Metrics */}
            <tr><th className="p-4 border-b border-r bg-gray-50">Price</th>{properties.map(p => <td key={p.id} className="p-4 border-b text-xl font-extrabold text-blue-600">₹{p.price}</td>)}</tr>
            <tr><th className="p-4 border-b border-r bg-gray-50">Type</th>{properties.map(p => <td key={p.id} className="p-4 border-b font-semibold text-gray-800">{p.propertyType}</td>)}</tr>
            <tr><th className="p-4 border-b border-r bg-gray-50">Bed / Bath</th>{properties.map(p => <td key={p.id} className="p-4 border-b text-gray-800">🛏️ {p.bedrooms} / 🛁 {p.bathrooms}</td>)}</tr>
            <tr><th className="p-4 border-b border-r bg-gray-50">Area</th>{properties.map(p => <td key={p.id} className="p-4 border-b text-gray-800">{p.area} sqft</td>)}</tr>
            <tr>
              <th className="p-4 border-b border-r bg-gray-50 align-top">Amenities</th>
              {properties.map(p => <td key={p.id} className="p-4 border-b text-sm text-gray-600">{p.amenities?.join(', ') || 'None specified'}</td>)}
            </tr>

            {/* Ethical Disclosures Section */}
            <tr><th colSpan={properties.length + 1} className="bg-orange-50 text-orange-900 p-4 border-b font-bold uppercase text-xs tracking-wider">Ethical & Safety Disclosures</th></tr>
            
            <tr>
              <th className="p-4 border-b border-r bg-gray-50">Platform Risk Score</th>
              {properties.map(p => <td key={p.id} className={`p-4 border-b font-bold ${p.riskScore > 30 ? 'text-red-600' : 'text-green-600'}`}>{p.riskScore} / 100</td>)}
            </tr>
            <tr>
              <th className="p-4 border-b border-r bg-gray-50">Documents Verified</th>
              {properties.map(p => {
                const hasVerifiedDocs = p.legalDocuments?.some((d: any) => d.isVerified);
                return <td key={p.id} className="p-4 border-b font-bold">{hasVerifiedDocs ? <span className="text-green-600">✅ Yes</span> : <span className="text-gray-400">❌ Pending</span>}</td>;
              })}
            </tr>
            <tr>
              <th className="p-4 border-b border-r bg-gray-50">Reported Structural Issues</th>
              {properties.map(p => <td key={p.id} className="p-4 border-b font-bold">{p.defectDisclosure?.hasStructuralIssues ? <span className="text-red-600">⚠️ Yes</span> : <span className="text-green-600">✅ Clean</span>}</td>)}
            </tr>
            <tr>
              <th className="p-4 border-b border-r bg-gray-50">Legal Disputes</th>
              {properties.map(p => <td key={p.id} className="p-4 border-b font-bold">{p.defectDisclosure?.hasLegalDisputes ? <span className="text-red-600">⚠️ Yes</span> : <span className="text-green-600">✅ Clean</span>}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}