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
  const [activeCheckinAttendee, setActiveCheckinAttendee] = useState(null);
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

  // Seat number state
  const [seatInput, setSeatInput] = useState('');
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatMsg, setSeatMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
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
    formData.append('serialNumber', activeCheckinAttendee?.serialNumber || activeCheckinRsvp?.serialNumber);
    if (fileToUpload) {
      formData.append('photo', fileToUpload, 'checkin.jpg');
    }

    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };
      
      const res = await axios.post(`${API_URL}/checkin`, formData, { headers });
      alert(`Guest checked in successfully! \nFamily: ${res.data.familyName}`);
      
      closeCheckinModal();
      performSearch(searchQuery); // Refresh search results
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to complete check-in.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckout = async (attendee) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/checkin/checkout`, {
        serialNumber: attendee.serialNumber
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
    setActiveCheckinAttendee(null);
    setCapturedBlob(null);
    setCapturedUrl('');
    setFileFallback(null);
    setFileUrl('');
    setError('');
    setSeatInput('');
    setSeatMsg('');
  };

  const handleAssignSeat = async (attendee) => {
    if (!seatInput.trim()) return;
    setSeatLoading(true);
    setSeatMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.patch(`${API_URL}/checkin/seat`, {
        serialNumber: attendee.serialNumber,
        seatNumber: seatInput.trim()
      }, { headers });
      setSeatMsg(`✅ Seat ${res.data.seatNumber} assigned!`);
      performSearch(searchQuery);
    } catch (err) {
      setSeatMsg(err.response?.data?.error || 'Failed to assign seat.');
    } finally {
      setSeatLoading(false);
    }
  };  return (
    <div className="min-h-screen text-gray-900 p-6 font-poppins selection:bg-wedding-wine selection:text-white" style={{background: '#F9FAFB'}}>
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div>
          <h2 className="text-wedding-wine font-playfair text-[10px] tracking-[0.2em] uppercase font-bold">Staff Access</h2>
          <h1 className="font-playfair text-xl text-gray-800 tracking-wider uppercase font-bold flex items-center gap-1.5">
            Bouncer Check-In
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[#722F37] hover:bg-wedding-wine/5 border border-wedding-wine/20 px-3.5 py-2 rounded-xl bg-white shadow-sm transition text-xs font-playfair tracking-wider cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> LOG OUT
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Search Bar */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by serial number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-900 focus:outline-none focus:border-wedding-wine transition"
                />
              </div>
              <button
                type="button"
                onClick={() => setQrScannerActive(true)}
                className="px-3.5 py-2 bg-[#FCFCFD] border border-gray-200 hover:border-wedding-wine text-[#722F37] rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2 bg-wedding-wine text-white hover:bg-wedding-wineDark transition font-playfair text-xs tracking-wider rounded-xl shadow-sm cursor-pointer"
            >
              {searching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-800">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider pl-1">Found ({searchResults.length}) RSVPs</p>
            
            {searchResults.map((rsvp) => (
              <div 
                key={rsvp.id} 
                className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-6"
              >
                {/* RSVP Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-playfair text-lg font-bold text-gray-900">
                      {rsvp.invite.familyName} Family
                    </span>
                    <span className="text-[10px] bg-wedding-wine/5 border border-wedding-wine/10 px-2.5 py-0.5 rounded-full font-mono text-wedding-wine uppercase font-semibold">
                      {rsvp.serialNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block font-medium">Allowed Guests:</span>
                      <span className="font-bold text-gray-800">{rsvp.invite.maxGuests}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">RSVP'd Count:</span>
                      <span className="font-bold text-gray-800">{rsvp.attendanceCount} guests</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Children:</span>
                      <span className="font-bold text-gray-800">{rsvp.anyChildren ? `${rsvp.childrenCount} attending` : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Status:</span>
                      <span className="font-bold text-[#722F37]">
                        {rsvp.attendees.filter(a => a.checkedIn).length} of {rsvp.attendees.length} Checked In
                      </span>
                    </div>
                  </div>

                  {/* Welcome/Guide notice */}
                  {(() => {
                    const firstTable = rsvp.attendees.find(a => a.table)?.table?.name;
                    const seats = rsvp.attendees.filter(a => a.seatNumber).map(a => a.seatNumber);
                    if (firstTable) {
                      return (
                        <div className="bg-[#722F37]/5 border border-wedding-wine/15 text-wedding-wine p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
                          ✨ Welcome! You are at <span className="font-bold text-wedding-wineDark">{firstTable}</span>
                          {seats.length > 0 && <span>, Seat{seats.length > 1 ? 's' : ''} <span className="font-mono text-wedding-wineDark">{seats.join(', ')}</span></span>}.
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Individual Guest Names & Checkin status */}
                  <div className="pt-2 space-y-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Attendee Passes:</span>
                    <div className="space-y-3">
                      {rsvp.attendees.map((att) => (
                        <div 
                          key={att.id} 
                          className="p-4 rounded-xl border border-gray-150 bg-[#FCFCFD] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <span className="font-semibold text-gray-800 text-sm block">
                              {att.fullName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-white border border-gray-200 px-2 py-0.5 rounded font-mono text-gray-500 font-medium">
                                {att.serialNumber}
                              </span>
                              {att.phoneNumber && (
                                <span className="text-[10px] text-gray-400">{att.phoneNumber}</span>
                              )}
                            </div>
                            
                            {/* Individual Checkin Details */}
                            {att.checkedIn && (
                              <div className="mt-2 text-[10px] text-green-700 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Checked In at {att.checkedInAt ? new Date(att.checkedInAt).toLocaleTimeString() : ''}
                              </div>
                            )}
                            {att.checkedOut && !att.checkedIn && (
                              <div className="mt-2 text-[10px] text-red-700 flex items-center gap-1 font-semibold">
                                <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Checked Out at {att.checkedOutAt ? new Date(att.checkedOutAt).toLocaleTimeString() : ''}
                              </div>
                            )}
                            {att.table && (
                              <div className="mt-1.5 text-[10px] text-[#722F37] flex items-center gap-1 font-bold">
                                🪑 Table: <span className="font-bold">{att.table.name}</span>
                                {att.seatNumber && <span className="text-gray-400 font-normal"> · Seat: <span className="font-bold font-mono">{att.seatNumber}</span></span>}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {att.checkedIn ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {att.checkInPhoto && (
                                  <a 
                                    href={att.checkInPhoto.startsWith('/uploads') ? `${BACKEND_URL}${att.checkInPhoto}` : att.checkInPhoto} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-block text-[10px] text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 transition shadow-sm font-semibold"
                                  >
                                    View Photo
                                  </a>
                                )}
                                <button
                                  onClick={() => handleCheckout(att)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-playfair text-[10px] tracking-wider rounded-lg border border-red-200 flex items-center gap-1 transition cursor-pointer shadow-sm font-semibold"
                                >
                                  <LogOut className="w-3 h-3" /> CHECK OUT
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveCheckinAttendee(att);
                                  setActiveCheckinRsvp(rsvp);
                                }}
                                className="px-4 py-2 bg-[#722F37] hover:bg-[#5A2328] text-white font-playfair text-[10px] tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm font-semibold"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-white" /> {att.checkedOut ? 'APPROVE RE-ENTRY' : 'APPROVE ENTRY'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* CHECK-IN CAMERA MODAL */}
      {activeCheckinRsvp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 relative flex flex-col gap-5 overflow-hidden max-h-[90vh] shadow-xl text-gray-900 animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div>
                <h3 className="font-playfair text-wedding-wine text-sm tracking-widest uppercase font-bold">Verify Guest Entry</h3>
                <p className="text-[12px] text-gray-700 font-bold truncate mt-0.5">{activeCheckinAttendee?.fullName || activeCheckinRsvp?.invite?.familyName}</p>
                <p className="text-[10px] text-gray-400 truncate">Pass: {activeCheckinAttendee?.serialNumber || activeCheckinRsvp?.serialNumber} ({activeCheckinRsvp?.invite?.familyName} Family)</p>
              </div>
              <button 
                onClick={closeCheckinModal}
                className="p-1 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-center leading-normal">
                {error}
              </p>
            )}

            {/* Video Viewport / Capture Preview */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-gray-200 flex items-center justify-center shadow-inner">
              
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
                  <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 italic">Camera inactive. Click "Start Camera" or select a file below.</p>
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
                    className="px-6 py-2.5 bg-wedding-wine text-white hover:bg-wedding-wineDark font-playfair text-xs tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4" /> SNAP & PREVIEW
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-playfair text-xs tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <RefreshCcw className="w-4 h-4 text-[#722F37]" /> {capturedUrl || fileUrl ? 'RE-TAKE PHOTO' : 'START CAMERA'}
                  </button>
                )}
              </div>

              {/* File Input Fallback Selector */}
              <div className="text-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2 font-medium">Or Use Local Image File</span>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl bg-[#FCFCFD] text-gray-700 hover:border-gray-300 text-xs font-semibold cursor-pointer select-none transition shadow-sm">
                  <FileImage className="w-3.5 h-3.5 text-wedding-wine" /> SELECT FILE
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileFallbackChange}
                    className="hidden"
                  />
                </label>
              </div>


              {/* Seat Number Assignment */}
              <div className="pt-3 border-t border-gray-150 text-left">
                <label className="text-[10px] text-[#722F37] uppercase tracking-widest block mb-2 font-bold">
                  🪑 Assign Seat Number <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. A12, Table 5, Row 3"
                    value={seatInput}
                    onChange={(e) => setSeatInput(e.target.value)}
                    className="flex-1 bg-[#FCFCFD] border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-wedding-wine placeholder:text-gray-300"
                  />
                  <button
                    onClick={() => handleAssignSeat(activeCheckinAttendee || { serialNumber: activeCheckinRsvp?.serialNumber })}
                    disabled={seatLoading || !seatInput.trim()}
                    className="px-4 py-2 bg-wedding-wine hover:bg-wedding-wineDark text-white font-playfair text-[10px] tracking-wider rounded-lg border border-wedding-wine/20 disabled:opacity-40 transition cursor-pointer shrink-0 shadow-sm"
                  >
                    {seatLoading ? '...' : 'ASSIGN'}
                  </button>
                </div>
                {seatMsg && (
                  <p className="text-[10px] mt-1.5 text-green-700 font-semibold">{seatMsg}</p>
                )}
              </div>

              {/* Complete Checkin CTA */}
              <button
                onClick={submitCheckin}
                disabled={checkinLoading}
                className="w-full py-3.5 bg-green-700 hover:bg-green-800 text-white font-playfair tracking-widest text-xs rounded-xl border border-green-600 hover:border-green-700 flex items-center justify-center gap-2 mt-4 disabled:opacity-40 transition cursor-pointer shadow-md font-bold"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 relative flex flex-col gap-5 overflow-hidden shadow-xl" style={{background:'white'}}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-250">
              <div>
                <h3 className="font-playfair text-[#722F37] text-sm tracking-widest uppercase font-bold">Scan Entry QR Code</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Point camera at the guest's QR code</p>
              </div>
              <button 
                onClick={() => setQrScannerActive(false)}
                className="p-1 text-gray-400 hover:text-gray-700 border border-gray-250 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanner Viewport */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-black border border-gray-200 flex items-center justify-center">
              <div id="qr-reader" className="w-full h-full object-cover"></div>
            </div>

            {qrScannerError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-center leading-normal">
                {qrScannerError}
              </p>
            )}

            <button
              onClick={() => setQrScannerActive(false)}
              className="w-full py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-playfair tracking-widest text-xs rounded-xl transition cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
