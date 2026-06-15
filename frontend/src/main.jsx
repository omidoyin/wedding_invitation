import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import EnvelopePage from './pages/EnvelopePage.jsx'
import MainPage from './pages/MainPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import CheckinDashboard from './pages/CheckinDashboard.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/invite/:token" element={<EnvelopePage />} />
        <Route path="/invite/:token/home" element={<MainPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        
        {/* Admin/Staff Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/checkin" element={<CheckinDashboard />} />
        
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
    </BrowserRouter>
  </React.StrictMode>,
)
