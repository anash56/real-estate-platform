import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function AdvancedSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  // Filter States
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const ALL_AMENITIES = ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Balcony'];

  // Initialize states from URL parameters on first load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search')) setSearch(params.get('search')!);
    if (params.get('propertyType')) setPropertyType(params.get('propertyType')!);
    if (params.get('minPrice')) setMinPrice(params.get('minPrice')!);
    if (params.get('maxPrice')) setMaxPrice(params.get('maxPrice')!);
    if (params.get('bedrooms')) setBedrooms(params.get('bedrooms')!);
    if (params.get('bathrooms')) setBathrooms(params.get('bathrooms')!);
    if (params.get('amenities')) setSelectedAmenities(params.get('amenities')!.split(','));
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    
    // Construct query parameters dynamically
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (propertyType) params.append('propertyType', propertyType);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (bedrooms) params.append('bedrooms', bedrooms);
    if (bathrooms) params.append('bathrooms', bathrooms);
    if (selectedAmenities.length > 0) params.append('amenities', selectedAmenities.join(','));
    
    // Update URL quietly so it's shareable
    navigate({ search: params.toString() }, { replace: true });

    try {
      const res = await fetch(`http://localhost:5000/api/properties?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProperties(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    // Adding a slight debounce effect for typing in the search box
    const timeoutId = setTimeout(() => {
      fetchProperties();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search, propertyType, minPrice, maxPrice, bedrooms, bathrooms, selectedAmenities]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const clearFilters = () => {
    setSearch(''); setPropertyType(''); setMinPrice(''); setMaxPrice('');
    setBedrooms(''); setBathrooms(''); setSelectedAmenities([]);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-4 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <div className="w-full lg:w-1/4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit sticky top-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800 underline">Clear All</button>
          </div>

          <div className="space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Location/Title</label>
              <input type="text" className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="City, Area, Name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Property Type</label>
              <select className="w-full border border-gray-300 p-2 rounded-lg outline-none bg-white" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="">All Types</option>
                <option value="APARTMENT">Apartments</option>
                <option value="VILLA">Villas</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range (₹)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" className="w-1/2 border border-gray-300 p-2 rounded-lg outline-none" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input type="number" placeholder="Max" className="w-1/2 border border-gray-300 p-2 rounded-lg outline-none" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
            </div>

            {/* Beds & Baths */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
                <select className="w-full border border-gray-300 p-2 rounded-lg outline-none bg-white" value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                <select className="w-full border border-gray-300 p-2 rounded-lg outline-none bg-white" value={bathrooms} onChange={e => setBathrooms(e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                </select>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Must-have Amenities</label>
              <div className="space-y-2">
                {ALL_AMENITIES.map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={selectedAmenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Properties for Sale</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 bg-white px-4 py-1 rounded-full shadow-sm text-sm border font-semibold hidden md:inline-block">{properties.length} results</span>
              <div className="flex bg-white rounded-lg shadow-sm border overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 text-sm font-bold transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Grid View</button>
                <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 text-sm font-bold border-l transition-colors ${viewMode === 'map' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Map View</button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-blue-600 font-bold animate-pulse">Searching properties...</div>
          ) : properties.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-200 text-gray-500">No properties match your exact filters. Try broadening your search!</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {properties.map(property => {
                const imgUrl = property.images && property.images.length > 0 ? `http://localhost:5000${property.images[0].imageUrl}` : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';
                return (
                  <Link to={`/property/${property.id}`} key={property.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow group flex flex-col">
                    <div className="relative h-48 overflow-hidden"><img src={imgUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /><div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-800">{property.propertyType}</div></div>
                    <div className="p-5 flex flex-col flex-1"><p className="text-2xl font-extrabold text-blue-600 mb-1">₹{property.price}</p><h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{property.title}</h3><p className="text-gray-500 text-sm mb-4 line-clamp-1">{property.address}, {property.city}</p><div className="flex justify-between items-center text-sm text-gray-600 mt-auto pt-4 border-t border-gray-100"><span className="flex items-center gap-1 font-semibold">🛏️ {property.bedrooms} Beds</span><span className="flex items-center gap-1 font-semibold">🛁 {property.bathrooms} Baths</span><span className="flex items-center gap-1 font-semibold">📏 {property.area} sqft</span></div></div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="h-[600px] w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
              <MapContainer center={[properties[0]?.latitude || 20.5937, properties[0]?.longitude || 78.9629]} zoom={5} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                {properties.map(property => {
                  const imgUrl = property.images && property.images.length > 0 ? `http://localhost:5000${property.images[0].imageUrl}` : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';
                  return (
                    <Marker key={property.id} position={[property.latitude, property.longitude]}>
                      <Popup>
                        <div className="w-48 font-sans">
                          <img src={imgUrl} alt={property.title} className="w-full h-28 object-cover rounded mb-2" />
                          <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{property.title}</h3>
                          <p className="text-blue-600 font-extrabold text-sm mb-2">₹{property.price}</p>
                          <Link to={`/property/${property.id}`} className="block text-center bg-blue-50 text-blue-700 py-1.5 rounded text-xs font-bold hover:bg-blue-100 transition">View Details</Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}