import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Camera, ArrowLeft, Upload, Grid } from 'lucide-react';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  async function fetchPhotos() {
    try {
      const res = await axios.get(`${API_URL}/gallery`);
      setPhotos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select an image file to upload.');
      return;
    }
    setUploadLoading(true);
    setUploadMsg('');

    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('uploadedBy', guestName);

    try {
      const res = await axios.post(`${API_URL}/gallery/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadMsg(res.data.message);
      setSelectedFile(null);
      setGuestName('');
      document.getElementById('file-upload').value = '';
      fetchPhotos(); // Reload gallery
    } catch (err) {
      console.error(err);
      setUploadMsg('Failed to upload photo. Only image files under 10MB are accepted.');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wedding-darkBg text-wedding-beige p-6 font-poppins selection:bg-wedding-wine selection:text-wedding-gold">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between border-b border-wedding-gold/15 pb-6 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-wedding-gold hover:text-wedding-goldLight font-playfair tracking-wider text-sm border border-wedding-gold/20 px-4 py-2 rounded-xl bg-wedding-darkCard/40 transition"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO INVITATION
        </button>

        <h1 className="font-playfair text-xl sm:text-2xl text-gold-gradient tracking-widest uppercase font-bold text-center">
          Gallery Photos
        </h1>

        <div className="w-20 hidden sm:block"></div> {/* Spacer */}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form (Sticky Sidebar on desktop) */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-wedding-gold/25 sticky top-6">
            <div className="flex items-center gap-2.5 mb-4 justify-center">
              <Camera className="w-5 h-5 text-wedding-gold" />
              <h2 className="font-playfair text-lg text-wedding-gold">Share a Moment</h2>
            </div>
            
            <form onSubmit={handleUploadPhoto} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs text-wedding-beige/70">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g., Uncle Deji"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl px-4 py-3 text-xs text-wedding-beige focus:outline-none focus:border-wedding-gold"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs text-wedding-beige/70">Select Image (Max 10MB)</label>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl px-4 py-2.5 text-xs text-wedding-beige file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-wedding-gold/20 file:bg-wedding-darkCard file:text-wedding-gold file:text-xs hover:file:bg-wedding-wine/25"
                />
              </div>

              {uploadMsg && (
                <p className="text-xs text-wedding-gold bg-wedding-wine/10 border border-wedding-gold/10 p-3 rounded-lg text-center font-medium leading-relaxed">
                  {uploadMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full py-4 bg-wedding-wine text-[#FAF8F5] font-bold hover:bg-wedding-wineDark transition-all duration-300 font-playfair tracking-widest text-xs rounded-xl border border-wedding-gold/20 hover:border-wedding-gold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {uploadLoading ? 'UPLOADING...' : 'UPLOAD PICTURE'}
              </button>
            </form>
          </div>
        </div>

        {/* Gallery Masonry/Grid Display */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wedding-gold"></div>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-2xl border border-wedding-gold/15">
              <Camera className="w-16 h-16 text-wedding-gold/30 mx-auto mb-3" />
              <p className="font-playfair text-lg text-wedding-gold mb-1">No Moments Shared Yet</p>
              <p className="text-sm text-wedding-beige/60 italic">Upload a picture using the sidebar to share your experience!</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 gap-4 space-y-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group overflow-hidden rounded-xl border border-wedding-gold/10 break-inside-avoid bg-wedding-darkCard/40 shadow-md">
                  <img 
                    src={photo.imageUrl.startsWith('/uploads') ? `${BACKEND_URL}${photo.imageUrl}` : photo.imageUrl} 
                    alt="Wedding moment" 
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                    <span className="text-[10px] text-wedding-gold font-semibold uppercase tracking-wider block">Uploaded By:</span>
                    <span className="text-[12px] text-[#FAF8F5] font-medium">{photo.uploadedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
