import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Mail, MailOpen, AlertCircle } from 'lucide-react';

export default function EnvelopePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [particles, setParticles] = useState([]);

  // Base API URL
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    // Generate floating background particles
    const generatedParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${6 + Math.random() * 6}s`,
      size: `${2 + Math.random() * 6}px`
    }));
    setParticles(generatedParticles);

    // Fetch personalized invitation details
    async function fetchInvite() {
      try {
        const res = await axios.get(`${API_URL}/invite/${token}`);
        setInvite(res.data);
      } catch (err) {
        console.error('Fetch invite error:', err);
        setError(err.response?.data?.error || 'Failed to load invitation. Please verify link.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvite();
    } else {
      setError('No token provided in invitation link.');
      setLoading(false);
    }
  }, [token]);

  const handleOpenEnvelope = () => {
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-wedding-darkBg">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-t-wedding-gold border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-b-wedding-wine border-t-transparent border-r-transparent border-l-transparent animate-spin duration-1000"></div>
        </div>
        <p className="font-playfair text-xl mt-6 text-wedding-gold tracking-widest animate-pulse">AALOVESTORY2026</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-wedding-darkBg p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-wedding-wine mx-auto mb-4" />
          <h2 className="font-playfair text-2xl text-wedding-gold mb-2">Invitation Error</h2>
          <p className="text-wedding-beige opacity-90 mb-6">{error}</p>
          <p className="text-xs text-gray-500">Please double check the link shared with you or contact the hosts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0F0F10] via-[#1A1113] to-[#0F0F10] flex flex-col items-center justify-center p-4">
      {/* Floating Sparkles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="sparkle-particle"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          }}
        />
      ))}

      {/* Decorative Gold Header */}
      <div className="text-center mb-8 z-10">
        <h2 className="text-wedding-gold font-playfair text-sm tracking-[0.3em] uppercase mb-1">A & A Love Story</h2>
        <h1 className="text-wedding-beige font-playfair text-3xl tracking-widest">AALOVESTORY2026</h1>
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-wedding-gold to-transparent mx-auto mt-3"></div>
      </div>

      {/* Envelope Container */}
      <div className="relative w-full max-w-[420px] aspect-[4/3] z-10 flex items-center justify-center">
        
        {/* The Card that slides up */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ translateY: 0, opacity: 0 }}
              animate={{ translateY: '-55%', opacity: 1 }}
              transition={{ delay: 0.8, duration: 1.2, cubicBezier: [0.16, 1, 0.3, 1] }}
              className="absolute w-[92%] h-[90%] bg-wedding-beige text-wedding-wineDark rounded-xl shadow-2xl p-6 flex flex-col justify-between border-2 border-wedding-gold/40 z-20"
            >
              <div className="text-center">
                <div className="border border-wedding-wine/20 p-4 rounded-lg h-full flex flex-col justify-between">
                  <h3 className="font-playfair text-xs tracking-[0.2em] uppercase text-wedding-wine/80 mb-2">You are cordially invited</h3>
                  
                  <div className="my-3">
                    <p className="font-playfair text-lg italic text-wedding-wine">The</p>
                    <p className="font-playfair text-2xl font-bold text-wedding-wineDark tracking-wide mt-1">
                      {invite?.familyName || 'Family'}
                    </p>
                    <p className="text-xs font-poppins text-gray-600 tracking-wider mt-1 uppercase">
                      Category: {invite?.category || 'Guest'}
                    </p>
                  </div>
                  
                  <p className="text-xs font-poppins text-gray-700 leading-relaxed max-w-[280px] mx-auto mt-2">
                    Warmly welcomes you to celebrate the joining of our hearts as we begin our forever.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/invite/${token}/home`)}
                className="w-full py-3 bg-wedding-wine text-wedding-beige hover:bg-wedding-wineDark transition-all duration-300 font-playfair tracking-widest text-sm rounded-lg hover:shadow-lg hover:border hover:border-wedding-gold/50 flex items-center justify-center gap-2 mt-4"
              >
                SEE MORE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Envelope Body */}
        <div 
          onClick={handleOpenEnvelope}
          className={`absolute w-full h-full bg-[#3B1519] rounded-2xl border border-wedding-gold/20 envelope-shadow cursor-pointer flex flex-col justify-between p-6 overflow-hidden z-30 transition-all duration-500 hover:scale-[1.02] ${isOpen ? 'pointer-events-none' : ''}`}
        >
          {/* Gold Decorative Corner Lines */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t border-l border-wedding-gold/30"></div>
          <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-wedding-gold/30"></div>
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l border-wedding-gold/30"></div>
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r border-wedding-gold/30"></div>

          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            {isOpen ? (
              <MailOpen className="w-16 h-16 text-wedding-gold animate-pulse" />
            ) : (
              <Mail className="w-16 h-16 text-wedding-gold animate-bounce" />
            )}
            <div>
              <p className="font-playfair text-lg text-wedding-gold tracking-widest">
                {isOpen ? 'INVITATION OPENED' : 'OPEN INVITATION'}
              </p>
              <p className="text-xs text-wedding-beige/60 mt-1 uppercase tracking-widest">
                Specially for {invite?.familyName}
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] text-wedding-gold/50 tracking-widest uppercase font-poppins">
            October 10, 2026
          </div>
        </div>
      </div>

      {/* Decorative footer */}
      <p className="text-[11px] text-wedding-gold/40 font-poppins tracking-[0.2em] mt-12 z-10 text-center">
        DESIGNED FOR THE WEDDING OF AYODEJI & ADESEWA
      </p>
    </div>
  );
}
