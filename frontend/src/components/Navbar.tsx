import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to trigger a re-render when the route changes

  // Read auth state directly from localStorage
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => { if (data.success) setNotifications(data.data); })
      .catch(err => console.error(err));

      fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
           socket = io('http://localhost:5000');
           socket.emit('join_user_room', data.data.id);
           socket.on('new_notification', (notification) => {
             setNotifications(prev => [notification, ...prev]);
           });
        }
      })
      .catch(err => console.error(err));
    }

    return () => {
      if (socket) socket.disconnect();
    }
  }, [token]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    await fetch('http://localhost:5000/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
            <Link to="/search" className="font-semibold text-gray-600 hover:text-blue-600 transition">Search</Link>
            {token ? (
              <div className="flex items-center gap-6">
                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className="text-gray-600 hover:text-blue-600 text-xl relative focus:outline-none"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown menu */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden flex flex-col z-50">
                      <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-center text-sm text-gray-500">You're all caught up!</p>
                        ) : (
                          notifications.map(notif => (
                            <Link key={notif.id} to={notif.link || '#'} onClick={() => setShowNotifications(false)} className={`block p-4 border-b hover:bg-gray-50 transition ${!notif.isRead ? 'bg-blue-50/50' : ''}`}>
                              <h4 className={`text-sm mb-1 ${!notif.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{notif.title}</h4>
                              <p className="text-xs text-gray-600 mb-2">{notif.message}</p>
                              <span className="text-[10px] text-gray-400">{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link to={getDashboardLink()} className="text-gray-600 hover:text-blue-600 font-bold transition">
                  My Dashboard
                </Link>
                <button onClick={handleLogout} className="bg-red-50 text-red-600 px-5 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-100">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link to="/login" className="font-bold text-gray-700 hover:text-blue-600 transition">Login</Link>
                <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}