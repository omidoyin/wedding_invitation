import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import EnvelopePage from './pages/EnvelopePage.jsx'
import MainPage from './pages/MainPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import CheckinDashboard from './pages/CheckinDashboard.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import { Volume2, VolumeX } from 'lucide-react'
import './index.css'

// Global Music Layout to keep track of music state across routes
function GlobalMusicLayout({ children }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const audioRef = useRef(null);
  const location = useLocation();

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('/now_and_always.mp3');
    audioRef.current.loop = true;

    // Listen for custom trigger from EnvelopePage seal click
    const handleStartMusic = () => {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log("Audio play blocked or failed:", err));
    };

    window.addEventListener('play-wedding-music', handleStartMusic);

    return () => {
      window.removeEventListener('play-wedding-music', handleStartMusic);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Generate tiny bubbles falling when music is playing
  useEffect(() => {
    if (!isPlaying) {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      setBubbles(prev => [
        ...prev.slice(-30), // Limit total active bubbles
        {
          id: Math.random(),
          left: `${Math.random() * 100}%`,
          size: `${4 + Math.random() * 8}px`,
          delay: `${Math.random() * 2}s`,
          duration: `${5 + Math.random() * 5}s`
        }
      ]);
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log(err));
    }
  };

  // Determine if we should show the global control (hide on admin routes)
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="relative min-h-screen">
      {children}

      {/* Tiny Bubbles Drop Visual Effect */}
      {isPlaying && !isAdminRoute && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
          {bubbles.map(b => (
            <span
              key={b.id}
              className="absolute bg-wedding-gold/20 rounded-full animate-float-bubble"
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                top: '-20px',
                animationDuration: b.duration,
                animationTimingFunction: 'linear'
              }}
            />
          ))}
        </div>
      )}

      {/* Global Control Button at the Bottom */}
      {!isAdminRoute && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center p-3 rounded-full bg-wedding-wine text-[#FAF8F5] border border-wedding-gold/40 shadow-2xl hover:scale-110 hover:bg-wedding-wineDark transition-all duration-300 group"
            title={isPlaying ? "Pause Music" : "Play Music"}
          >
            {isPlaying ? (
              <Volume2 className="w-5 h-5 text-wedding-goldLight animate-pulse" />
            ) : (
              <VolumeX className="w-5 h-5 text-[#FAF8F5]/80 group-hover:text-wedding-gold" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Admin/Staff Routes (Out of Music Layout) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/checkin" element={<CheckinDashboard />} />

        {/* Public Routes with Global Music */}
        <Route
          path="/*"
          element={
            <GlobalMusicLayout>
              <Routes>
                <Route path="/invite/:token" element={<EnvelopePage />} />
                <Route path="/invite/:token/home" element={<MainPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                
                {/* Fallbacks */}
                <Route path="/" element={<div className="flex items-center justify-center min-h-screen text-center p-4">
                  <div className="glass-panel p-8 rounded-2xl max-w-md">
                    <h1 className="font-playfair text-3xl text-wedding-gold mb-4">AALOVESTORY2026</h1>
                    <p className="text-wedding-beige mb-6">Please open the personalized invitation link sent to you by the hosts.</p>
                    <p className="text-sm text-gray-500">For inquiries, contact the wedding planners.</p>
                  </div>
                </div>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </GlobalMusicLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)

