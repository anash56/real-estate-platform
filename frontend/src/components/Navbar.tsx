import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to trigger a re-render when the route changes

  // Read auth state directly from localStorage
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (role === 'AGENT') return '/dashboard/agent';
    if (role === 'BUYER') return '/dashboard/buyer';
    if (role === 'ADMIN') return '/dashboard/admin';
    return '/login';
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="text-2xl font-extrabold text-blue-600 tracking-tight flex items-center gap-2">
            <span className="text-3xl">🏛️</span> EthicalEstates
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {token ? (
              <>
                <Link to={getDashboardLink()} className="text-gray-600 hover:text-blue-600 font-bold transition">
                  My Dashboard
                </Link>
                <button onClick={handleLogout} className="bg-red-50 text-red-600 px-5 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-100">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}