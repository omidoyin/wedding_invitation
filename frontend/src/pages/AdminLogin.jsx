import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Key, User, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/admin/login`, {
        username,
        password
      });

      const { token, user } = response.data;
      
      // Store auth details in localStorage
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));

      // Redirect based on role
      if (user.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/admin/checkin');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4 font-poppins text-gray-900 selection:bg-wedding-wine selection:text-white">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <h2 className="text-[#722F37] font-playfair text-xs tracking-[0.3em] uppercase mb-1 font-bold">AALOVESTORY2026</h2>
        <h1 className="text-gray-800 font-playfair text-2xl tracking-widest uppercase font-bold">Admin Access</h1>
        <div className="w-16 h-[2px] bg-wedding-wine/20 mx-auto mt-3"></div>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-sm p-8 rounded-2xl border border-gray-200 bg-white shadow-md relative overflow-hidden transition-all duration-200">
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-700 leading-normal">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-gray-900 font-medium focus:outline-none focus:border-wedding-wine focus:bg-white transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-gray-900 font-medium focus:outline-none focus:border-wedding-wine focus:bg-white transition"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#722F37] text-white font-bold hover:bg-[#5A2328] transition-all duration-150 font-playfair tracking-widest text-xs rounded-xl disabled:opacity-50 mt-2 shadow-sm cursor-pointer"
          >
            {loading ? 'AUTHENTICATING...' : 'LOG IN'}
          </button>
        </form>
      </div>

      <p className="text-[10px] text-gray-400 font-poppins mt-8 tracking-widest uppercase">
        © 2026 AALOVESTORY. ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}
