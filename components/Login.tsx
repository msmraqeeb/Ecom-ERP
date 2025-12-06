import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole, username: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hardcoded credentials as requested
    if (username === 'admin@kidsparadise.com.bd' && password === 'Kp$h0pbd') {
      onLogin('admin', username);
    } else if (username === 'viewer' && password === '123456') {
      onLogin('viewer', username);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-kp-red p-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            KidsParadise
          </h1>
          <p className="text-red-100 text-sm mt-2 uppercase tracking-wider font-medium">Admin Portal</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username / Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none transition-all"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-kp-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 bg-gray-50 py-2 px-4 rounded-lg inline-block border border-gray-100">
               <span className="font-semibold">User:</span> viewer &nbsp;|&nbsp; <span className="font-semibold">Password:</span> 123456
            </p>
          </div>
          
          <div className="mt-6 text-center">
             <p className="text-xs text-gray-400">
               Protected System. Authorized Access Only.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;