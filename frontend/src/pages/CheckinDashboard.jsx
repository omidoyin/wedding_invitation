import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, ShieldAlert, CheckCircle2, Camera, LogOut, 
  X, RefreshCcw, UserCheck, AlertCircle, FileImage, QrCode
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function CheckinDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Camera & Checkin states
  const [activeCheckinRsvp, setActiveCheckinRsvp] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  
  // File fallback state
  const [fileFallback, setFileFallback] = useState(null);
  const [fileUrl, setFileUrl] = useState('');

  // QR scanner state
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [qrScannerError, setQrScannerError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    // Check authentication
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('admin_user'));
      if (storedUser?.role !== 'Admin' && storedUser?.role !== 'Staff/Bouncer') {
        navigate('/admin/login');
        return;
      }
      setUser(storedUser);
    } catch (err) {
      localStorage.clear();
      navigate('/admin/login');
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const performSearch = async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    setSearching(true);
    setError('');
    setSearchResults([]);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/checkin/search`, {
        params: { query: queryText.trim() },
        headers
      });
      setSearchResults(res.data);
      if (res.data.length === 0) {
        setError('No guest or RSVP found matching that query.');
      }
    } catch (err) {
      console.error(err);
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performSearch(searchQuery);
  };

  // QR Code camera scanner lifecycle
  useEffect(() => {
    let html5QrCode = null;

    if (qrScannerActive) {
      setQrScannerError('');
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              setSearchQuery(decodedText);
              performSearch(decodedText);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                  setQrScannerActive(false);
                }).catch(err => {
                  console.error('Error stopping QR scanner:', err);
                  setQrScannerActive(false);
                });
              } else {
                setQrScannerActive(false);
              }
            },
            (errorMessage) => {
              // Ignore normal scanning updates
            }
          ).catch(err => {
            console.error("Camera startup error:", err);
            setQrScannerError("Could not start camera. Please verify permission.");
          });
        } catch (e) {
          console.error("Scanner initialization failed:", e);
          setQrScannerError("Scanner initialization failed.");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Error stopping scanner on cleanup:", err));
        }
      };
    }
  }, [qrScannerActive]);

  // Start Camera Feed
  const startCamera = async () => {
    setError('');
    setCapturedBlob(null);
    setCapturedUrl('');
    setFileFallback(null);
    setFileUrl('');
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error, switching to file upload fallback:', err);
      setCameraActive(false);
      setError('Camera access denied or unsupported. Please upload a photo instead.');
    }
  };

  // Stop Camera Feed
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  // Capture Photo from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.85);
  };

  // Handle File Input Fallback
  const handleFileFallbackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileFallback(file);
      setFileUrl(URL.createObjectURL(file));
      setCapturedBlob(null);
      setCapturedUrl('');
      setError('');
    }
  };

  // Submit Check-in (Photo is optional)
  const submitCheckin = async () => {
    setCheckinLoading(true);

    const fileToUpload = capturedBlob || fileFallback;
    const formData = new FormData();
    formData.append('serialNumber', activeCheckinRsvp.serialNumber);
    if (fileToUpload) {
      formData.append('photo', fileToUpload, 'checkin.jpg');
    }

    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };
      
      const res = await axios.post(`${API_URL}/checkin`, formData, { headers });
      alert(`Guest checked in successfully! \nFamily: ${res.data.familyName} \nGuests: ${res.data.attendanceCount}`);
      
      closeCheckinModal();
      performSearch(searchQuery); // Refresh search results
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to complete check-in.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckout = async (rsvp) => {
    if (!window.confirm(`Are you sure you want to CHECK OUT the ${rsvp.invite.familyName} family?`)) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/checkin/checkout`, {
        serialNumber: rsvp.serialNumber
      }, { headers });

      alert(`Guest checked out successfully! \nFamily: ${res.data.familyName}`);
      performSearch(searchQuery); // Refresh search results
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to check-out.');
    }
  };

  const closeCheckinModal = () => {
    stopCamera();
    setActiveCheckinRsvp(null);
    setCapturedBlob(null);
    setCapturedUrl('');
    setFileFallback(null);
    setFileUrl('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-wedding-darkBg text-wedding-beige p-4 font-poppins selection:bg-wedding-wine selection:text-wedding-gold">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-wedding-gold/15 pb-4 mb-6">
        <div>
          <h2 className="text-wedding-gold font-playfair text-[10px] tracking-[0.2em] uppercase">Staff Access</h2>
          <h1 className="font-playfair text-lg text-gold-gradient tracking-widest uppercase font-bold flex items-center gap-1.5">
            Bouncer Check-In
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-wedding-wine hover:bg-wedding-wine/25 border border-wedding-wine/40 px-3 py-1.5 rounded-lg bg-wedding-darkCard/40 transition text-xs font-playfair tracking-wider"
        >
          <LogOut className="w-3.5 h-3.5" /> LOG OUT
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Search Bar */}
        <div className="glass-panel p-5 rounded-2xl border border-wedding-gold/20">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-wedding-gold/60" />
                <input
                  type="text"
                  placeholder="Search by serial number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-wedding-beige focus:outline-none focus:border-wedding-gold"
                />
              </div>
              <button
                type="button"
                onClick={() => setQrScannerActive(true)}
                className="px-3.5 py-2.5 bg-wedding-darkCard border border-wedding-gold/20 hover:border-wedding-gold text-wedding-gold rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 bg-wedding-wine text-wedding-beige hover:bg-wedding-wineDark transition font-playfair text-xs tracking-wider rounded-xl border border-wedding-gold/20 cursor-pointer"
            >
              {searching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2 bg-wedding-wine/20 border border-wedding-wine/40 p-4 rounded-xl text-xs text-wedding-beige/90">
            <AlertCircle className="w-5 h-5 text-wedding-gold shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-wedding-gold font-semibold uppercase tracking-wider pl-1">Found ({searchResults.length}) RSVPs</p>
            
            {searchResults.map((rsvp) => (
              <div 
                key={rsvp.id} 
                className="glass-panel p-6 rounded-2xl border border-wedding-gold/15 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* RSVP Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-playfair text-lg font-bold text-wedding-beige">
                      {rsvp.invite.familyName} Family
                    </span>
                    <span className="text-[10px] bg-wedding-darkCard border border-wedding-gold/15 px-2.5 py-0.5 rounded-full font-mono text-wedding-gold uppercase">
                      {rsvp.serialNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-wedding-beige/50 block">Attendees Registered:</span>
                      <span className="font-semibold">{rsvp.attendanceCount} guests</span>
                    </div>
                    <div>
                      <span className="text-wedding-beige/50 block">Status:</span>
                      <span className={`font-semibold ${
                        rsvp.checkedIn 
                          ? 'text-wedding-emeraldLight' 
                          : rsvp.checkedOut 
                            ? 'text-wedding-wineLight' 
                            : 'text-amber-600'
                      }`}>
                        {rsvp.checkedIn 
                          ? 'Checked In' 
                          : rsvp.checkedOut 
                            ? 'Checked Out' 
                            : 'Pending Entry'}
                      </span>
                    </div>
                  </div>

                  {/* Individual Guest Names */}
                  <div className="pt-2">
                    <span className="text-[10px] text-wedding-gold uppercase tracking-wider block font-semibold mb-1">Attendee Names:</span>
                    <ul className="text-xs text-wedding-beige/80 list-disc pl-4 space-y-0.5">
                      {rsvp.attendees.map((att) => (
                        <li key={att.id}>{att.fullName} {att.phoneNumber ? `(${att.phoneNumber})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Status Column / Check-in CTA */}
                <div className="shrink-0 flex flex-col items-start md:items-end gap-3 justify-center">
                  {rsvp.checkedIn ? (
                    <div className="text-left md:text-right space-y-2">
                      <div className="flex items-center gap-1.5 text-wedding-emeraldLight text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Checked In
                      </div>
                      <span className="text-[10px] text-wedding-beige/50 block">
                        At: {rsvp.checkedInAt ? new Date(rsvp.checkedInAt).toLocaleTimeString() : ''}
                      </span>
                      <div className="flex gap-2 flex-wrap items-center mt-1">
                        {rsvp.checkInPhoto && (
                          <a 
                            href={rsvp.checkInPhoto.startsWith('/uploads') ? `http://localhost:5000${rsvp.checkInPhoto}` : rsvp.checkInPhoto} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block text-[10px] text-wedding-gold border border-wedding-gold/20 px-2 py-1 rounded bg-wedding-darkCard/40 hover:bg-wedding-wine/20"
                          >
                            View Entry Photo
                          </a>
                        )}
                        <button
                          onClick={() => handleCheckout(rsvp)}
                          className="px-3 py-1.5 bg-wedding-wine hover:bg-wedding-wineDark text-wedding-lightBeige hover:text-white font-playfair text-[10px] tracking-wider rounded-lg border border-wedding-gold/20 flex items-center gap-1 transition cursor-pointer"
                        >
                          <LogOut className="w-3 h-3" /> CHECK OUT
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-left md:text-right space-y-2">
                      {rsvp.checkedOut && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-wedding-wineLight text-xs font-semibold justify-start md:justify-end">
                            <ShieldAlert className="w-4 h-4" /> Checked Out
                          </div>
                          <span className="text-[10px] text-wedding-beige/50 block">
                            At: {rsvp.checkedOutAt ? new Date(rsvp.checkedOutAt).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setActiveCheckinRsvp(rsvp)}
                        className="px-6 py-3 bg-[#133015] hover:bg-wedding-emeraldDark text-wedding-beige font-playfair text-xs tracking-wider rounded-xl border border-wedding-gold/25 hover:border-wedding-gold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-wedding-gold" /> {rsvp.checkedOut ? 'APPROVE RE-ENTRY' : 'APPROVE ENTRY'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* CHECK-IN CAMERA MODAL */}
      {activeCheckinRsvp && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-wedding-darkCard border border-wedding-gold/20 rounded-3xl p-6 relative flex flex-col gap-5 overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-wedding-gold/10">
              <div>
                <h3 className="font-playfair text-wedding-gold text-sm tracking-widest uppercase">Verify Guest Entry</h3>
                <p className="text-[11px] text-wedding-beige/60 truncate mt-0.5">{activeCheckinRsvp.invite.familyName} Family | {activeCheckinRsvp.serialNumber}</p>
              </div>
              <button 
                onClick={closeCheckinModal}
                className="p-1 text-wedding-beige/70 hover:text-wedding-beige border border-wedding-gold/15 rounded-lg hover:bg-wedding-wine/25 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {error && (
              <p className="text-xs text-wedding-gold bg-wedding-wine/10 border border-wedding-gold/10 p-2.5 rounded-lg text-center leading-normal">
                {error}
              </p>
            )}

            {/* Video Viewport / Capture Preview */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-wedding-gold/10 flex items-center justify-center">
              
              {/* WebRTC Video stream */}
              {cameraActive && (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              )}

              {/* Snapshot captured preview */}
              {capturedUrl && (
                <img 
                  src={capturedUrl} 
                  alt="Captured attendee" 
                  className="w-full h-full object-cover"
                />
              )}

              {/* Local File fallback preview */}
              {fileUrl && (
                <img 
                  src={fileUrl} 
                  alt="Uploaded file" 
                  className="w-full h-full object-cover"
                />
              )}

              {/* Inactive state */}
              {!cameraActive && !capturedUrl && !fileUrl && (
                <div className="text-center p-4">
                  <Camera className="w-12 h-12 text-wedding-gold/30 mx-auto mb-2" />
                  <p className="text-xs text-wedding-beige/50 italic">Camera inactive. Click "Start Camera" or select a file below.</p>
                </div>
              )}
            </div>

            {/* Hidden canvas for video captures */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Modal Controls */}
            <div className="space-y-4">
              
              {/* Camera Trigger controls */}
              <div className="flex justify-center gap-3">
                {cameraActive ? (
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 bg-wedding-wine text-wedding-beige font-playfair text-xs tracking-wider rounded-lg border border-wedding-gold/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> SNAP & PREVIEW
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 bg-wedding-darkCard border border-wedding-gold/30 text-wedding-gold hover:border-wedding-gold font-playfair text-xs tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCcw className="w-4 h-4" /> {capturedUrl || fileUrl ? 'RE-TAKE PHOTO' : 'START CAMERA'}
                  </button>
                )}
              </div>

              {/* File Input Fallback Selector */}
              <div className="text-center">
                <span className="text-[10px] text-wedding-beige/40 uppercase tracking-widest block mb-2">Or Use Local Image File</span>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 border border-wedding-gold/20 rounded-xl bg-wedding-darkCard/40 text-wedding-beige/85 hover:border-wedding-gold text-xs font-playfair cursor-pointer select-none transition">
                  <FileImage className="w-3.5 h-3.5 text-wedding-gold" /> SELECT FILE
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileFallbackChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Complete Checkin CTA */}
              <button
                onClick={submitCheckin}
                disabled={checkinLoading}
                className="w-full py-4 bg-[#133015] hover:bg-wedding-emeraldDark text-wedding-beige font-playfair tracking-widest text-xs rounded-xl border border-wedding-gold/20 hover:border-wedding-gold flex items-center justify-center gap-2 mt-4 disabled:opacity-40 transition cursor-pointer"
              >
                {checkinLoading 
                  ? 'UPLOADING & REGISTERING...' 
                  : (capturedBlob || fileFallback) 
                    ? 'COMPLETE ENTRY CHECK-IN' 
                    : 'CHECK IN WITHOUT PHOTO'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QR CODE SCANNER MODAL */}
      {qrScannerActive && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-wedding-darkCard border border-wedding-gold/20 rounded-3xl p-6 relative flex flex-col gap-5 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-wedding-gold/10">
              <div>
                <h3 className="font-playfair text-wedding-gold text-sm tracking-widest uppercase">Scan Entry QR Code</h3>
                <p className="text-[11px] text-wedding-beige/60 mt-0.5">Point camera at the guest's QR code</p>
              </div>
              <button 
                onClick={() => setQrScannerActive(false)}
                className="p-1 text-wedding-beige/70 hover:text-wedding-beige border border-wedding-gold/15 rounded-lg hover:bg-wedding-wine/25 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanner Viewport */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-wedding-gold/10 flex items-center justify-center">
              <div id="qr-reader" className="w-full h-full object-cover"></div>
            </div>

            {qrScannerError && (
              <p className="text-xs text-wedding-gold bg-wedding-wine/10 border border-wedding-gold/10 p-2.5 rounded-lg text-center leading-normal">
                {qrScannerError}
              </p>
            )}

            <button
              onClick={() => setQrScannerActive(false)}
              className="w-full py-3.5 bg-wedding-wine text-wedding-beige font-playfair tracking-widest text-xs rounded-xl border border-wedding-gold/20 transition cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
