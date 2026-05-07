import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'BUYER' | 'AGENT' | 'ADMIN'>('BUYER');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && !acceptedTerms) {
      alert('You must accept the Terms and Ethical Guidelines to register.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin 
        ? 'http://localhost:5000/api/auth/login' 
        : 'http://localhost:5000/api/auth/signup';
        
      const payload = isLogin 
        ? { email, password } 
        : { email, password, fullName, role, acceptedTerms };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('userRole', data.data.user.role);
        
        const userRole = data.data.user.role;
        navigate(userRole === 'AGENT' ? '/dashboard/agent' : userRole === 'ADMIN' ? '/dashboard/admin' : '/dashboard/buyer');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Network error. Please make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              {/* Role Selection (Registration Only) */}
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`flex-1 py-3 rounded-lg border font-bold ${role === 'BUYER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  I'm a Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('AGENT')}
                  className={`flex-1 py-3 rounded-lg border font-bold ${role === 'AGENT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  I'm an Agent
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`flex-1 py-3 rounded-lg border font-bold ${role === 'ADMIN' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  I'm an Admin
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="flex items-start mt-4">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700 cursor-pointer">
                    I agree to the <Link to="/terms" target="_blank" className="text-blue-600 hover:underline">Terms</Link>, <Link to="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</Link>, and <Link to="/ethical-code" target="_blank" className="text-blue-600 hover:underline">Ethical Code</Link>.
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              required
              className="mt-1 w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}