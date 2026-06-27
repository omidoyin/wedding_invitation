import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, CheckSquare, ShieldCheck, Heart, LogOut, Plus, 
  Trash2, Check, Download, Image, DollarSign, Filter, RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [invites, setInvites] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Invite form state
  const [familyName, setFamilyName] = useState('');
  const [category, setCategory] = useState('Family');
  const [maxGuests, setMaxGuests] = useState(2);
  const [createMsg, setCreateMsg] = useState('');
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'invites', 'gallery', 'donations'

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
      if (storedUser?.role !== 'Admin') {
        // Only Admin allowed here
        navigate('/admin/checkin');
        return;
      }
      setUser(storedUser);
      loadDashboardData();
    } catch (err) {
      localStorage.clear();
      navigate('/admin/login');
    }
  }, [token]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, invitesRes, pendingPhotosRes, donationsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers }),
        axios.get(`${API_URL}/admin/invites`, { headers }),
        axios.get(`${API_URL}/admin/gallery/pending`, { headers }),
        axios.get(`${API_URL}/paystack/donations`, { headers })
      ]);

      setStats(statsRes.data);
      setInvites(invitesRes.data);
      setPendingPhotos(pendingPhotosRes.data);
      setDonations(donationsRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!familyName) return;
    setCreateMsg('');

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/admin/invites`, {
        familyName,
        category,
        maxGuests
      }, { headers });

      setCreateMsg(`Created successfully! Token: ${res.data.invite.inviteToken}`);
      setFamilyName('');
      loadDashboardData(); // Refresh list & stats
    } catch (err) {
      console.error(err);
      setCreateMsg('Failed to create invitation.');
    }
  };

  const handleModeratePhoto = async (id, action) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/admin/gallery/${id}/moderate`, { action }, { headers });
      loadDashboardData(); // Refresh photos list
    } catch (err) {
      console.error(err);
      alert('Failed to moderate photo.');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'AALOVESTORY2026_Wedding_Report.xlsx';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error(err);
      alert('Failed to download report.');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-wedding-darkBg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wedding-gold"></div>
        <p className="font-playfair text-sm text-wedding-gold mt-4">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wedding-darkBg text-wedding-beige p-6 font-poppins selection:bg-wedding-wine selection:text-wedding-gold">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between border-b border-wedding-gold/15 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-wedding-gold font-playfair text-xs tracking-[0.2em] uppercase">Control Center</h2>
          <h1 className="font-playfair text-2xl text-gold-gradient tracking-widest uppercase font-bold flex items-center gap-2">
            AALOVESTORY2026 Admin
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="p-2 border border-wedding-gold/20 rounded-xl bg-wedding-darkCard/40 text-wedding-gold hover:bg-wedding-wine/20 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 text-wedding-beige hover:bg-wedding-wine/20 font-playfair text-xs tracking-wider border border-wedding-gold/20 px-4 py-2 rounded-xl bg-wedding-darkCard/40 transition"
          >
            <Download className="w-4 h-4" /> EXPORT EXCEL
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-wedding-wine hover:bg-wedding-wineDark hover:text-wedding-beige font-playfair text-xs tracking-wider border border-wedding-wine/45 px-4 py-2 rounded-xl bg-wedding-darkCard/40 transition"
          >
            <LogOut className="w-4 h-4" /> LOG OUT
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="max-w-6xl mx-auto flex border-b border-wedding-gold/10 mb-8 overflow-x-auto gap-2">
        {['overview', 'invites', 'gallery', 'donations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-6 font-playfair text-sm tracking-wider uppercase border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-wedding-gold text-wedding-gold font-bold' 
                : 'border-transparent text-wedding-beige/60 hover:text-wedding-beige'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div className="max-w-6xl mx-auto">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-6 rounded-2xl border border-wedding-gold/15 flex items-center gap-4">
                <Users className="w-8 h-8 text-wedding-gold" />
                <div>
                  <span className="text-[10px] text-wedding-beige/60 uppercase tracking-wider block">Total Invites</span>
                  <span className="text-xl font-bold text-wedding-beige">{stats?.totalInvites}</span>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-wedding-gold/15 flex items-center gap-4">
                <CheckSquare className="w-8 h-8 text-wedding-gold" />
                <div>
                  <span className="text-[10px] text-wedding-beige/60 uppercase tracking-wider block">RSVPs Submitted</span>
                  <span className="text-xl font-bold text-wedding-beige">
                    {stats?.totalRSVPs} <span className="text-xs text-gray-500">({stats?.totalInvites ? Math.round((stats.totalRSVPs / stats.totalInvites) * 100) : 0}%)</span>
                  </span>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-wedding-gold/15 flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-wedding-gold" />
                <div>
                  <span className="text-[10px] text-wedding-beige/60 uppercase tracking-wider block">Guests Checked In</span>
                  <span className="text-xl font-bold text-wedding-beige">
                    {stats?.checkedInAttendees} <span className="text-xs text-gray-500">/ {stats?.totalExpectedGuests} expected</span>
                  </span>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-wedding-gold/15 flex items-center gap-4">
                <DollarSign className="w-8 h-8 text-wedding-gold" />
                <div>
                  <span className="text-[10px] text-wedding-beige/60 uppercase tracking-wider block">Total Donations</span>
                  <span className="text-xl font-bold text-wedding-beige">₦{stats?.totalDonations.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Create Invite Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Form: Generate Invite */}
              <div className="glass-panel p-6 rounded-3xl border border-wedding-gold/20">
                <h3 className="font-playfair text-lg text-wedding-gold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-wedding-gold" /> Generate Invitation Link
                </h3>
                
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-wedding-beige/70">Family or Group Name</label>
                    <input
                      type="text"
                      placeholder="E.g., Adebayo Family"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      required
                      className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl px-4 py-3 text-xs text-wedding-beige focus:outline-none focus:border-wedding-gold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-wedding-beige/70">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl px-4 py-3 text-xs text-wedding-beige focus:outline-none focus:border-wedding-gold"
                      >
                        <option value="Family">Family</option>
                        <option value="Friend">Friend</option>
                        <option value="VIP">VIP</option>
                        <option value="Colleague">Colleague</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-wedding-beige/70">Max Guest Count</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={maxGuests}
                        onChange={(e) => setMaxGuests(parseInt(e.target.value))}
                        required
                        className="w-full bg-wedding-darkCard border border-wedding-gold/20 rounded-xl px-4 py-3 text-xs text-wedding-beige focus:outline-none focus:border-wedding-gold"
                      />
                    </div>
                  </div>

                  {createMsg && (
                    <p className="text-xs text-wedding-gold bg-wedding-wine/10 border border-wedding-gold/10 p-2.5 rounded-lg text-center font-medium break-all">
                      {createMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-wedding-wine text-wedding-beige hover:bg-wedding-wineDark transition-all duration-300 font-playfair tracking-widest text-xs rounded-xl border border-wedding-gold/20 hover:border-wedding-gold"
                  >
                    GENERATE LINK
                  </button>
                </form>
              </div>

              {/* Photo Approval Quick Section */}
              <div className="glass-panel p-6 rounded-3xl border border-wedding-gold/20">
                <h3 className="font-playfair text-lg text-wedding-gold mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-wedding-gold" /> Gallery Approvals ({pendingPhotos.length})
                </h3>

                {pendingPhotos.length === 0 ? (
                  <p className="text-xs text-wedding-beige/50 italic text-center py-10">No pending photos for moderation.</p>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {pendingPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center justify-between p-3 bg-wedding-darkCard/40 border border-wedding-gold/10 rounded-xl gap-4">
                        <img 
                          src={photo.imageUrl.startsWith('/uploads') ? `http://localhost:5000${photo.imageUrl}` : photo.imageUrl} 
                          alt="Pending upload" 
                          className="w-12 h-12 object-cover rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-wedding-gold block">By: {photo.uploadedBy}</span>
                          <span className="text-[11px] text-wedding-beige/70 truncate block">{photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModeratePhoto(photo.id, 'approve')}
                            className="p-1.5 bg-wedding-emerald/20 border border-wedding-emerald/40 text-wedding-emeraldLight hover:bg-wedding-emerald/40 rounded-lg transition"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleModeratePhoto(photo.id, 'reject')}
                            className="p-1.5 bg-wedding-wine/25 border border-wedding-wine/40 text-wedding-wine hover:bg-wedding-wine/45 rounded-lg transition"
                            title="Delete/Reject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: INVITES LIST */}
        {activeTab === 'invites' && (
          <div className="glass-panel p-6 rounded-3xl border border-wedding-gold/20 overflow-hidden">
            <h3 className="font-playfair text-lg text-wedding-gold mb-4">Guest Invitations List ({invites.length})</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-wedding-gold/20 text-wedding-gold font-playfair uppercase tracking-wider">
                    <th className="pb-3 pr-4">Family Name</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Max Guests</th>
                    <th className="pb-3 pr-4">RSVP Status</th>
                    <th className="pb-3 pr-4">Invited Token</th>
                    <th className="pb-3">Checked In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wedding-gold/10">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-wedding-darkCard/20">
                      <td className="py-3.5 pr-4 font-semibold text-wedding-beige">{invite.familyName}</td>
                      <td className="py-3.5 pr-4 text-wedding-beige/80">{invite.category}</td>
                      <td className="py-3.5 pr-4 text-wedding-beige/80">{invite.maxGuests}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          invite.rsvpSubmitted 
                            ? 'bg-wedding-emerald/20 text-wedding-emeraldLight border border-wedding-emerald/30' 
                            : 'bg-wedding-wine/10 text-wedding-wine hover:bg-wedding-wine/25 border border-wedding-wine/20'
                        }`}>
                          {invite.rsvpSubmitted ? 'RSVP\'d' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 select-all font-mono text-wedding-gold">
                        invite/{invite.inviteToken}
                      </td>
                      <td className="py-3.5 font-semibold">
                        {invite.rsvp?.checkedIn ? (
                          <span className="text-wedding-emeraldLight">Checked In</span>
                        ) : invite.rsvp?.checkedOut ? (
                          <span className="text-wedding-wineLight">Checked Out</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GALLERY MODERATION */}
        {activeTab === 'gallery' && (
          <div className="glass-panel p-6 rounded-3xl border border-wedding-gold/20">
            <h3 className="font-playfair text-lg text-wedding-gold mb-6">Gallery Photos Moderation ({pendingPhotos.length} pending)</h3>
            
            {pendingPhotos.length === 0 ? (
              <div className="text-center py-20">
                <Image className="w-12 h-12 text-wedding-gold/20 mx-auto mb-2" />
                <p className="text-sm text-wedding-beige/50 italic">All photo uploads have been moderated.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="border border-wedding-gold/15 bg-wedding-darkCard/40 rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
                    <img 
                      src={photo.imageUrl.startsWith('/uploads') ? `http://localhost:5000${photo.imageUrl}` : photo.imageUrl} 
                      alt="Pending approval" 
                      className="w-full aspect-square object-cover rounded-xl mb-4 border border-wedding-gold/10"
                    />
                    <div>
                      <span className="text-[10px] text-wedding-gold uppercase tracking-wider block font-semibold">Uploaded By:</span>
                      <span className="text-xs text-wedding-beige block mb-4">{photo.uploadedBy}</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleModeratePhoto(photo.id, 'approve')}
                          className="py-2.5 bg-[#133015] hover:bg-wedding-emeraldDark text-wedding-beige rounded-xl text-xs font-playfair tracking-wider border border-wedding-emerald/40 hover:border-wedding-gold flex items-center justify-center gap-1.5 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> APPROVE
                        </button>
                        <button
                          onClick={() => handleModeratePhoto(photo.id, 'reject')}
                          className="py-2.5 bg-wedding-wine/25 hover:bg-wedding-wineDark text-wedding-wine hover:text-wedding-beige rounded-xl text-xs font-playfair tracking-wider border border-wedding-wine/45 flex items-center justify-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> REJECT
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DONATIONS */}
        {activeTab === 'donations' && (
          <div className="glass-panel p-6 rounded-3xl border border-wedding-gold/20">
            <h3 className="font-playfair text-lg text-wedding-gold mb-4">Financial Support History ({donations.length})</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-wedding-gold/20 text-wedding-gold font-playfair uppercase tracking-wider">
                    <th className="pb-3 pr-4">Donor Name</th>
                    <th className="pb-3 pr-4">Amount (NGN)</th>
                    <th className="pb-3 pr-4">Payment Reference</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Date Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wedding-gold/10">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-wedding-darkCard/20">
                      <td className="py-3.5 pr-4 font-semibold text-wedding-beige">{donation.donorName || 'Anonymous'}</td>
                      <td className="py-3.5 pr-4 text-wedding-gold font-bold">₦{donation.amount.toLocaleString()}</td>
                      <td className="py-3.5 pr-4 font-mono text-wedding-beige/70">{donation.reference}</td>
                      <td className="py-3.5 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-wedding-emerald/20 text-wedding-emeraldLight border border-wedding-emerald/30">
                          {donation.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-wedding-beige/80">
                        {donation.createdAt ? new Date(donation.createdAt).toLocaleString() : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
