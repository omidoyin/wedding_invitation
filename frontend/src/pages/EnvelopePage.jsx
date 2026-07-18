import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';

export default function EnvelopePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [particles, setParticles] = useState([]);
  const [cardSlideY, setCardSlideY] = useState(-180);
  const containerRef = useRef(null);

  // Base API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Compute responsive card slide distance based on container height
  useEffect(() => {
    function computeSlide() {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight;
        // Slide up by ~32% of the container height for all screen sizes
        if (h > 0) {
          setCardSlideY(-(h * 0.32));
        }
      }
    }
    computeSlide();
    const timer = setTimeout(computeSlide, 100);
    const timer2 = setTimeout(computeSlide, 500);
    window.addEventListener('resize', computeSlide);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', computeSlide);
    };
  }, [loading, isOpen]);

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
    window.dispatchEvent(new CustomEvent('play-wedding-music'));
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#FFFDFC] to-[#FAF8F5] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
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
      <div className="text-center mb-6 sm:mb-8 lg:mb-10 z-10">
        <h2 className="text-wedding-gold font-playfair text-xs sm:text-sm lg:text-base tracking-[0.3em] uppercase mb-1">A &amp; A Love Story</h2>
        <h1 className="text-wedding-wine font-playfair text-2xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-widest uppercase">AALOVESTORY2026</h1>
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-wedding-gold to-transparent mx-auto mt-3"></div>
      </div>

      {/* Envelope Container — responsive sizing via CSS min() */}
      <div
        ref={containerRef}
        onClick={!isOpen ? handleOpenEnvelope : undefined}
        className={`relative z-10 transition-all duration-500 ${!isOpen ? 'hover:scale-[1.02] active:scale-[0.99] cursor-pointer' : ''}`}
        style={{
          perspective: '1000px',
          width: 'min(92vw, 680px)',
          aspectRatio: '4/3',
        }}
      >

        {/* Envelope Back (Inside Lining) */}
        <div className="absolute inset-0 bg-[#40161A] rounded-2xl border border-wedding-gold/15 overflow-hidden z-10 shadow-inner">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute inset-3 border border-wedding-gold/10 rounded-xl pointer-events-none"></div>
        </div>

        {/* The Card that slides up — y computed from container height */}
        <motion.div
          initial={{ y: 15, scale: 0.95, zIndex: 20, opacity: 0.9 }}
          animate={isOpen ? {
            y: cardSlideY,
            scale: 1.05,
            zIndex: 50,
            opacity: 1
          } : {
            y: 15,
            scale: 0.95,
            zIndex: 10,
            opacity: 0.9
          }}
          transition={{ delay: 0.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[90%] h-[90%] left-[5%] bg-white text-wedding-wineDark rounded-xl shadow-2xl flex flex-col justify-between border-2 border-wedding-gold/40 overflow-hidden"
          style={{ top: '5%' }}
        >
          {/* Card Inner Content */}
          <div className="flex-1 flex flex-col justify-center text-center p-3 sm:p-4 lg:p-6">
            <div className="border border-wedding-wine/20 p-2 sm:p-3 lg:p-5 rounded-lg flex flex-col justify-between h-full gap-2">
              <h3 className="font-playfair text-[9px] sm:text-xs lg:text-sm tracking-[0.2em] uppercase text-wedding-wine/80 mt-1">
                You are cordially invited
              </h3>

              <div>
                <p className="font-playfair text-xs sm:text-base italic text-wedding-wine">The</p>
                <p className="font-playfair text-lg sm:text-2xl lg:text-3xl font-bold text-wedding-wineDark tracking-wide capitalize leading-tight">
                  {invite?.isAttendee ? invite.currentAttendee?.fullName : (invite?.familyName || 'Family')}
                </p>
              </div>

              <p className="text-[9px] sm:text-[11px] lg:text-xs font-poppins text-gray-700 leading-relaxed max-w-[280px] mx-auto">
                We warmly welcome you to celebrate the joining of our hearts as we begin our forever.
              </p>
            </div>
          </div>

          <div className="p-2 sm:p-3 lg:p-4">
            <button
              onClick={(e) => {
                if (!isOpen) return;
                e.stopPropagation();
                navigate(`/invite/${token}/home`);
              }}
              className={`w-full py-2.5 sm:py-3 bg-wedding-wine text-[#FAF8F5] hover:bg-wedding-wineDark transition-all duration-300 font-playfair tracking-widest text-xs sm:text-sm rounded-lg hover:shadow-lg hover:border hover:border-wedding-gold/50 flex items-center justify-center gap-2 ${isOpen ? 'cursor-pointer' : 'pointer-events-none'}`}
            >
              SEE MORE
            </button>
          </div>
        </motion.div>

        {/* Envelope Top Flap (Folds Open) */}
        <motion.div
          initial={{ rotateX: 0, zIndex: 40 }}
          animate={isOpen ? { rotateX: 180, zIndex: 5 } : { rotateX: 0, zIndex: 40 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-full h-[50%] origin-top pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <svg viewBox="0 0 400 150" className="w-full h-full drop-shadow-md">
            <polygon points="0,0 200,150 400,0" fill="#3B1519" stroke="#D4AF37" strokeWidth="1.5" />
          </svg>
        </motion.div>

        {/* Envelope Front Flaps (Sides and Bottom - static cover) */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-2xl">
            <polygon points="0,0 180,150 0,300" fill="#3B1519" stroke="#5A2328" strokeWidth="1" opacity="0.98" />
            <polygon points="400,0 220,150 400,300" fill="#3B1519" stroke="#5A2328" strokeWidth="1" opacity="0.98" />
            <polygon points="0,300 200,155 400,300" fill="#2E0E11" stroke="#D4AF37" strokeWidth="1" />
          </svg>
        </div>

        {/* Closed Envelope Text & Wax Seal Overlay */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-40 text-center pointer-events-none"
            >
              {/* Top Text: Open Invitation */}
              <div className="absolute top-5 sm:top-6 left-0 right-0">
                <p className="font-playfair text-sm sm:text-base lg:text-lg text-wedding-gold tracking-[0.35em] uppercase font-bold drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] filter brightness-110">
                  Open Invitation
                </p>
              </div>

              {/* Center Element: Golden Wax Seal */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-[#FFE07D] via-[#D4AF37] to-[#A37B10] flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.5)] border border-[#AA7C11]/40 transform active:scale-95 transition-transform duration-150 animate-float">
                  <div className="absolute inset-1.5 rounded-[47%_53%_49%_51%/_51%_49%_53%_47%] border-2 border-[#8C6D12]/20 bg-gradient-to-br from-[#FFEAA7] via-[#D4AF37] to-[#AA7C11] shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <div className="w-[82%] h-[82%] rounded-full border border-dashed border-[#4A1D23]/40 flex items-center justify-center">
                      <span className="font-playfair text-lg sm:text-xl lg:text-2xl font-extrabold text-[#4A1D23] tracking-widest drop-shadow-[1.5px_1.5px_0px_rgba(255,255,255,0.4)]">
                        A&amp;A
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Element: Guest Name Label Card */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-[#FAF8F5] text-wedding-wineDark border-2 border-wedding-gold/60 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                <p className="text-[10px] text-wedding-gold font-poppins uppercase tracking-widest font-bold">
                  Specially Invited
                </p>
                <p className="font-playfair text-sm sm:text-base lg:text-lg font-extrabold tracking-wide text-wedding-wine mt-0.5 capitalize truncate">
                  {invite?.isAttendee ? invite.currentAttendee?.fullName : (invite?.familyName || 'Family')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Decorative footer */}
      <p className="text-[11px] text-wedding-gold/90 font-poppins tracking-[0.2em] mt-10 sm:mt-16 z-10 text-center">
        DESIGNED FOR THE WEDDING OF AYODEJI &amp; ADESEWA
      </p>
    </div>
  );
}
