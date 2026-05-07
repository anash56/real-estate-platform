import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          setFullName(data.data.fullName || '');
          setPhone(data.data.phone || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ fullName, phone })
      });
      const data = await res.json();
      if (data.success) {
        alert('Profile updated successfully');
        setUser({ ...user, fullName, phone });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, profilePhoto: data.data.profilePhoto });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error uploading avatar');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <div className="text-center mt-10 text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Profile Settings</h1>
      
      <div className="bg-white rounded-xl shadow border border-gray-100 p-8 flex flex-col md:flex-row gap-8">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4 border-b md:border-b-0 md:border-r border-gray-200 pb-8 md:pb-0 md:pr-8">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg relative group">
            <img 
              src={user?.profilePhoto ? `http://localhost:5000${user.profilePhoto}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=0D8ABC&color=fff`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
            <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <span className="text-xs font-bold">Change</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
            </label>
          </div>
          {isUploading && <p className="text-sm text-blue-600 font-semibold animate-pulse">Uploading...</p>}
          <div className="text-center">
            <p className="font-bold text-lg">{user?.fullName}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}