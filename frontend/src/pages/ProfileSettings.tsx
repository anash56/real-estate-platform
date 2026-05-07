import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
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
        setUser({ ...user, fullName, phone, phoneVerified: data.data.phoneVerified });
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

  const handleSendOtp = async (type: 'email' | 'phone') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/auth/verify/${type}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`OTP sent to your ${type}!`);
        type === 'email' ? setShowEmailOtp(true) : setShowPhoneOtp(true);
      } else alert(data.error);
    } catch (err) { alert(`Error sending ${type} OTP`); }
  };

  const handleVerifyOtp = async (type: 'email' | 'phone') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/auth/verify/${type}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: type === 'email' ? emailOtp : phoneOtp })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${type} verified successfully!`);
        type === 'email' ? setShowEmailOtp(false) : setShowPhoneOtp(false);
        type === 'email' ? setEmailOtp('') : setPhoneOtp('');
        setUser({ ...user, [`${type}Verified`]: true });
      } else alert(data.error);
    } catch (err) { alert(`Error verifying ${type} OTP`); }
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
            <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
              {user?.role}
            </span>
            <div className="mt-4 flex flex-col gap-2 text-xs">
              <span className={`px-2 py-1 rounded font-bold border ${user?.emailVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {user?.emailVerified ? '✅ Email Verified' : '⚠️ Email Unverified'}
              </span>
              <span className={`px-2 py-1 rounded font-bold border ${user?.phoneVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {user?.phoneVerified ? '✅ Phone Verified' : '⚠️ Phone Unverified'}
              </span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                {!user?.emailVerified && (
                  <button type="button" onClick={() => handleSendOtp('email')} className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-full font-bold transition">
                    Verify Email
                  </button>
                )}
              </div>
              <input type="email" disabled value={user?.email || ''} className="w-full border p-3 rounded-lg outline-none bg-gray-50 text-gray-500" />
              {showEmailOtp && (
                <div className="flex gap-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input type="text" placeholder="Enter 6-digit OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => handleVerifyOtp('email')} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
                    Submit
                  </button>
                </div>
              )}
            </div>
            
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                {!user?.phoneVerified && user?.phone && (
                  <button type="button" onClick={() => handleSendOtp('phone')} className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-full font-bold transition">
                    Verify Phone
                  </button>
                )}
              </div>
              <input 
                type="tel" 
                className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              {showPhoneOtp && (
                <div className="flex gap-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input type="text" placeholder="Enter 6-digit OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => handleVerifyOtp('phone')} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Submit</button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">If you change your phone number, you will need to re-verify it.</p>
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