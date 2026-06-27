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
    <div className="min-h-screen bg-gradient-to-b from-[#0F0F10] via-[#1A1113] to-[#0F0F10] flex flex-col items-center justify-center p-4 font-poppins text-[#FAF8F5] selection:bg-wedding-wine selection:text-wedding-gold">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <h2 className="text-wedding-gold font-playfair text-xs tracking-[0.3em] uppercase mb-1">AALOVESTORY2026</h2>
        <h1 className="text-[#FAF8F5] font-playfair text-2xl tracking-widest uppercase font-bold">Admin Access</h1>
        <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-3"></div>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-sm p-8 rounded-3xl border border-wedding-gold/25 relative overflow-hidden shadow-2xl" style={{background: 'rgba(26,17,19,0.92)', backdropFilter: 'blur(12px)'}}>
        {/* Decorative corner accents */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t border-l border-wedding-gold/20"></div>
        <div className="absolute top-2 right-2 w-5 h-5 border-t border-r border-wedding-gold/20"></div>
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b border-l border-wedding-gold/20"></div>
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b border-r border-wedding-gold/20"></div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-wedding-wine/40 border border-wedding-wine/60 p-3.5 rounded-xl text-xs text-[#FAF8F5] leading-normal">
              <ShieldAlert className="w-5 h-5 text-wedding-gold shrink-0 animate-bounce" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1 text-left">
            <label className="text-xs text-[#E5C04A] font-bold uppercase tracking-wider block">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-wedding-gold/60" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-wedding-gold/20 rounded-xl pl-10 pr-4 py-3.5 text-xs text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1 text-left">
            <label className="text-xs text-[#E5C04A] font-bold uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-wedding-gold/60" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-wedding-gold/20 rounded-xl pl-10 pr-4 py-3.5 text-xs text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-wedding-gold text-wedding-wineDark font-bold hover:bg-wedding-goldLight hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-300 font-playfair tracking-widest text-xs rounded-xl border border-wedding-goldLight/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'AUTHENTICATING...' : 'LOG IN'}
          </button>
        </form>
      </div>

      <p className="text-[10px] text-[#D4AF37]/60 font-poppins mt-8 tracking-widest uppercase">
        © 2026 AALOVESTORY. ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}
