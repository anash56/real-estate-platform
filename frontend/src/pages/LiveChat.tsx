import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function LiveChat() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inquiry, setInquiry] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserAndHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      // Fetch current logged in user so we know if they are the sender
      const userRes = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (userData.success) setCurrentUser(userData.data);

      // Fetch inquiry details
      const inqRes = await fetch(`http://localhost:5000/api/inquiries/${inquiryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const inqData = await inqRes.json();
      if (inqData.success) setInquiry(inqData.data);

      // Fetch chat history
      const msgRes = await fetch(`http://localhost:5000/api/inquiries/${inquiryId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const msgData = await msgRes.json();
      if (msgData.success) setMessages(msgData.data);
    };

    fetchUserAndHistory();

    // Setup WebSocket connection
    socket = io('http://localhost:5000');
    socket.emit('join_room', inquiryId);

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [inquiryId, navigate]);

  useEffect(() => {
    // Auto-scroll to the newest message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    socket.emit('send_message', {
      inquiryId,
      senderId: currentUser.id,
      content: newMessage
    });

    setNewMessage('');
  };

  const handleReport = async () => {
    if (!inquiry) return;
    const reason = prompt('Please describe the issue or reason for blocking/reporting:');
    if (!reason) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ agentId: inquiry.property.agentId, propertyId: inquiry.propertyId, reason })
      });
      const data = await res.json();
      if (data.success) {
        alert('Report submitted successfully. Our admins will review this conversation.');
      } else alert(data.error);
    } catch (err) { alert('Error submitting report'); }
  };

  if (!currentUser) return <div className="p-8 text-center text-gray-500">Loading secure chat room...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 mt-4 h-[80vh] flex flex-col">
      <div className="bg-white rounded-t-xl shadow border-b border-gray-100 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Chat</h1>
          <p className="text-sm text-gray-500">{inquiry?.property?.title ? `Regarding: ${inquiry.property.title}` : 'Secure end-to-end messaging'}</p>
        </div>
        <div className="flex items-center gap-4">
          {currentUser?.role === 'BUYER' && (
            <button onClick={handleReport} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
              🚩 Report / Block
            </button>
          )}
          <Link to={`/dashboard/${currentUser?.role?.toLowerCase()}`} className="text-blue-600 font-bold hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex flex-col gap-4 border-x border-gray-200 shadow-inner">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1 px-1">{msg.sender?.fullName || 'User'}</span>
              <div className={`px-4 py-2 rounded-xl max-w-[75%] ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-white p-4 rounded-b-xl shadow border-t border-gray-100 flex gap-4">
        <input type="text" className="flex-1 border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 transition">Send</button>
      </form>
    </div>
  );
}