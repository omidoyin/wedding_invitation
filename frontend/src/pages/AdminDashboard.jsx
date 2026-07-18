import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, CheckSquare, ShieldCheck, LogOut, Plus, 
  Trash2, Check, Download, Image, DollarSign, RefreshCw, Copy,
  ChevronDown, X, Edit2, Table2, GripVertical, Eye, EyeOff,
  AlertCircle, ArrowRight, LayoutGrid
} from 'lucide-react';

/* ─────────────────── helpers ─────────────────── */
const SIDE_COLORS = {
  Bride:  { bg: '#FDF2F8', border: '#F9A8D4', text: '#9D174D', badge: '#EC4899' },
  Groom:  { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF', badge: '#3B82F6' },
  Neutral:{ bg: '#F9FAFB', border: '#D1D5DB', text: '#374151', badge: '#6B7280' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [invites, setInvites] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [donations, setDonations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Invite creation */
  const [familyName, setFamilyName]   = useState('');
  const [category, setCategory]       = useState('Family');
  const [maxGuests, setMaxGuests]     = useState(2);
  const [inviteSide, setInviteSide]   = useState('Neutral');
  const [createMsg, setCreateMsg]     = useState('');

  /* Seating planner */
  const [showTableModal, setShowTableModal]     = useState(false);
  const [tableName, setTableName]               = useState('');
  const [tableCapacity, setTableCapacity]       = useState(8);
  const [tableSide, setTableSide]               = useState('Neutral');
  const [editingTableId, setEditingTableId]     = useState(null);
  const [tableMsg, setTableMsg]                 = useState('');
  const [seatingPublished, setSeatingPublished] = useState(false);
  const [publishLoading, setPublishLoading]     = useState(false);
  const [assigningId, setAssigningId]           = useState(null); // rsvpId being assigned
  const [dragTarget, setDragTarget]             = useState(null); // tableId being dragged over
  const [filterSide, setFilterSide]             = useState('All');
  const [keepFamily, setKeepFamily]             = useState(true);

  /* UI */
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedId, setCopiedId]   = useState(null);

  const API_URL      = import.meta.env.VITE_API_URL      || 'http://localhost:5000/api';
  const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL  || 'http://localhost:5000';
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const token        = localStorage.getItem('admin_token');
  const headers      = { Authorization: `Bearer ${token}` };

  /* ───── auth check ───── */
  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('admin_user'));
      if (u?.role !== 'Admin') { navigate('/admin/checkin'); return; }
      setUser(u);
      loadDashboardData();
    } catch { localStorage.clear(); navigate('/admin/login'); }
  }, [token]);

  /* ───── data loading ───── */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, invitesRes, photosRes, donationsRes, tablesRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`,           { headers }),
        axios.get(`${API_URL}/admin/invites`,         { headers }),
        axios.get(`${API_URL}/admin/gallery/pending`, { headers }),
        axios.get(`${API_URL}/paystack/donations`,    { headers }),
        axios.get(`${API_URL}/admin/tables`,          { headers }),
      ]);
      setStats(statsRes.data);
      setInvites(invitesRes.data);
      setPendingPhotos(photosRes.data);
      setDonations(donationsRes.data);
      setTables(tablesRes.data);
      setSeatingPublished(invitesRes.data.some(i => i.seatingPublished));
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally { setLoading(false); }
  };

  /* ───── handlers ───── */
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!familyName) return;
    setCreateMsg('');
    try {
      const res = await axios.post(`${API_URL}/admin/invites`, {
        familyName, category, maxGuests, side: inviteSide
      }, { headers });
      setCreateMsg(`✅ Created! Share this link:\n${FRONTEND_URL}/invite/${res.data.invite.inviteToken}`);
      setFamilyName('');
      loadDashboardData();
    } catch (err) {
      setCreateMsg('❌ Failed to create invite.');
    }
  };

  const handleModeratePhoto = async (photoId, action) => {
    try {
      await axios.post(`${API_URL}/admin/gallery/${photoId}/${action}`, {}, { headers });
      loadDashboardData();
    } catch { alert('Failed to moderate photo.'); }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/export`, {
        headers, responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'AALOVESTORY2026_Wedding_Report.xlsx';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch { alert('Failed to download report.'); }
  };

  const handleCopyLink = (inviteToken, id) => {
    navigator.clipboard.writeText(`${FRONTEND_URL}/invite/${inviteToken}`).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  /* ── seating handlers ── */
  const openCreateTable = () => {
    setEditingTableId(null); setTableName(''); setTableCapacity(8); setTableSide('Neutral');
    setTableMsg(''); setShowTableModal(true);
  };

  const openEditTable = (tbl) => {
    setEditingTableId(tbl.id); setTableName(tbl.name); setTableCapacity(tbl.capacity);
    setTableSide(tbl.side || 'Neutral'); setTableMsg(''); setShowTableModal(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault(); setTableMsg('');
    try {
      if (editingTableId) {
        await axios.put(`${API_URL}/admin/tables/${editingTableId}`, {
          name: tableName, capacity: tableCapacity, side: tableSide
        }, { headers });
      } else {
        await axios.post(`${API_URL}/admin/tables`, {
          name: tableName, capacity: tableCapacity, side: tableSide
        }, { headers });
      }
      setShowTableModal(false);
      loadDashboardData();
    } catch (err) {
      setTableMsg(err.response?.data?.error || 'Failed to save table.');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Remove this table? All seat assignments will be cleared.')) return;
    try {
      await axios.delete(`${API_URL}/admin/tables/${tableId}`, { headers });
      loadDashboardData();
    } catch { alert('Failed to delete table.'); }
  };

  const handleAssignToTable = async (rsvpId, tableId) => {
    setAssigningId(rsvpId);
    try {
      await axios.post(`${API_URL}/admin/seating/assign`, {
        rsvpId, tableId, keepFamily
      }, { headers });
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign guest.');
    } finally { setAssigningId(null); }
  };

  const handleUnassign = async (rsvpId) => {
    setAssigningId(rsvpId);
    try {
      await axios.post(`${API_URL}/admin/seating/assign`, {
        rsvpId, tableId: null
      }, { headers });
      loadDashboardData();
    } catch { alert('Failed to unassign guest.'); }
    finally { setAssigningId(null); }
  };

  const handlePublishToggle = async () => {
    setPublishLoading(true);
    try {
      await axios.post(`${API_URL}/admin/seating/publish`, {
        published: !seatingPublished
      }, { headers });
      setSeatingPublished(p => !p);
    } catch { alert('Failed to toggle seating visibility.'); }
    finally { setPublishLoading(false); }
  };

  /* ───── drag ─ drop ───── */
  const handleDragStart = (e, rsvpId) => {
    e.dataTransfer.setData('rsvpId', rsvpId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, tableId) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    setDragTarget(tableId);
  };
  const handleDrop = (e, tableId) => {
    e.preventDefault(); setDragTarget(null);
    const rsvpId = e.dataTransfer.getData('rsvpId');
    if (rsvpId) handleAssignToTable(parseInt(rsvpId), tableId);
  };

  /* ───── derived data ───── */
  const rsvpdInvites = invites.filter(i => i.rsvp);
  const assignedRsvpIds = new Set(
    tables.flatMap(t => (t.attendees || []).map(a => a.rsvp?.id).filter(Boolean))
  );
  const unassignedRsvps = rsvpdInvites.filter(i => i.rsvp && !assignedRsvpIds.has(i.rsvp.id));
  const filteredUnassigned = filterSide === 'All'
    ? unassignedRsvps
    : unassignedRsvps.filter(i => (i.side || 'Neutral') === filterSide);

  /* ─────────────────────── LOADING ─────────────────────── */
  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#722F37]"></div>
      <p className="font-playfair text-sm text-[#722F37] mt-4 tracking-wider">Loading Dashboard...</p>
    </div>
  );

  const TABS = ['overview', 'invites', 'seating', 'gallery', 'donations'];
  const TAB_LABELS = { overview: 'Overview', invites: 'Invites', seating: '🪑 Seating', gallery: 'Gallery', donations: 'Donations' };

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <div className="min-h-screen font-poppins text-gray-900 selection:bg-[#722F37] selection:text-white" style={{ background: '#F9FAFB' }}>

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#722F37] uppercase tracking-[0.2em] font-bold font-playfair">Control Centre</p>
            <h1 className="font-playfair text-xl text-gray-900 font-bold tracking-wide">AALOVESTORY2026</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDashboardData} className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition shadow-sm cursor-pointer" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleExportData} className="flex items-center gap-2 text-gray-700 font-semibold text-xs border border-gray-200 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition shadow-sm cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#722F37]" /> Export Excel
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-[#722F37] font-semibold text-xs border border-red-200 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 transition shadow-sm cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* ── TABS ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 px-5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#722F37] text-[#722F37]'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ══ TAB: OVERVIEW ══ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Invites',    value: stats?.totalInvites,       icon: <Users className="w-6 h-6 text-[#722F37]" />,     sub: null },
                { label: 'RSVPs Submitted',  value: stats?.totalRSVPs,         icon: <CheckSquare className="w-6 h-6 text-blue-500" />, sub: `${stats?.totalInvites ? Math.round((stats.totalRSVPs/stats.totalInvites)*100):0}% response` },
                { label: 'Guests Checked In',value: stats?.checkedInAttendees, icon: <ShieldCheck className="w-6 h-6 text-green-500" />,sub: `of ${stats?.totalExpectedGuests} expected` },
                { label: 'Total Donations',  value: `₦${(stats?.totalDonations||0).toLocaleString()}`, icon: <DollarSign className="w-6 h-6 text-amber-500" />, sub: null },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    {s.sub && <p className="text-[10px] text-gray-400">{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Invite */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-playfair text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#722F37]" /> Generate Invitation Link
                </h3>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Family / Group Name</label>
                    <input
                      type="text" placeholder="E.g., Adebayo Family" value={familyName}
                      onChange={e => setFamilyName(e.target.value)} required
                      className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#722F37] transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#722F37] transition">
                        {['Family','Friend','VIP','Colleague'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1.5">Max Guests</label>
                      <input type="number" min="1" max="20" value={maxGuests} onChange={e => setMaxGuests(parseInt(e.target.value))} required
                        className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#722F37] transition" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Guest Side</label>
                    <div className="flex gap-2">
                      {['Bride','Groom','Neutral'].map(s => (
                        <button key={s} type="button" onClick={() => setInviteSide(s)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${inviteSide===s ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {createMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-xs font-medium whitespace-pre-wrap break-all">
                      {createMsg}
                    </div>
                  )}

                  <button type="submit" className="w-full py-3 bg-[#722F37] hover:bg-[#5A2328] text-white font-bold text-sm rounded-xl transition shadow-sm cursor-pointer">
                    GENERATE LINK
                  </button>
                </form>
              </div>

              {/* Gallery approvals */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-playfair text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#722F37]" /> Gallery Approvals
                  <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pendingPhotos.length}</span>
                </h3>
                {pendingPhotos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-10">No pending photos.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {pendingPhotos.map(photo => (
                      <div key={photo.id} className="flex items-center p-3 border border-gray-100 rounded-xl bg-gray-50 gap-3">
                        <img src={photo.imageUrl.startsWith('/uploads') ? `${BACKEND_URL}${photo.imageUrl}` : photo.imageUrl}
                          alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{photo.uploadedBy}</p>
                          <p className="text-[10px] text-gray-400">{photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleModeratePhoto(photo.id, 'approve')}
                            className="p-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg transition cursor-pointer" title="Approve">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleModeratePhoto(photo.id, 'reject')}
                            className="p-1.5 bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 rounded-lg transition cursor-pointer" title="Reject">
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* ══ TAB: INVITES ══ */}
        {activeTab === 'invites' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-playfair text-base font-bold text-gray-800">Guest Invitations ({invites.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="px-6 py-3.5">Family Name</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Side</th>
                    <th className="px-6 py-3.5">Max</th>
                    <th className="px-6 py-3.5">RSVP</th>
                    <th className="px-6 py-3.5">Invite Link</th>
                    <th className="px-6 py-3.5">Checked In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invites.map(invite => (
                    <tr key={invite.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-800">{invite.familyName}</td>
                      <td className="px-6 py-4 text-gray-500">{invite.category}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{
                          background: SIDE_COLORS[invite.side || 'Neutral']?.bg,
                          borderColor: SIDE_COLORS[invite.side || 'Neutral']?.border,
                          color: SIDE_COLORS[invite.side || 'Neutral']?.text,
                        }}>{invite.side || 'Neutral'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{invite.maxGuests}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          invite.rsvpSubmitted
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{invite.rsvpSubmitted ? "RSVP'd" : 'Pending'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a href={`${FRONTEND_URL}/invite/${invite.inviteToken}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[#722F37] hover:underline text-[10px] max-w-[180px] truncate block">
                            {FRONTEND_URL}/invite/{invite.inviteToken}
                          </a>
                          <button onClick={() => handleCopyLink(invite.inviteToken, invite.id)}
                            className={`shrink-0 p-1.5 rounded-lg border transition cursor-pointer ${copiedId===invite.id ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700'}`}>
                            {copiedId===invite.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {invite.rsvp?.checkedIn
                          ? <span className="text-green-600 font-bold">✓ Checked In</span>
                          : invite.rsvp?.checkedOut
                          ? <span className="text-red-500 font-bold">Checked Out</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB: SEATING PLANNER ══ */}
        {activeTab === 'seating' && (
          <div className="space-y-6">

            {/* Seating Header Controls */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-playfair text-base font-bold text-gray-800 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-[#722F37]" /> Seating Planner
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tables.length} tables · {rsvpdInvites.length} RSVPs · {unassignedRsvps.length} unassigned
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Keep Family Toggle */}
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer text-xs font-semibold text-gray-600 select-none">
                  <input type="checkbox" checked={keepFamily} onChange={e => setKeepFamily(e.target.checked)} className="accent-[#722F37] w-4 h-4 cursor-pointer" />
                  Keep family together
                </label>

                {/* Publish toggle */}
                <button onClick={handlePublishToggle} disabled={publishLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition shadow-sm cursor-pointer ${
                    seatingPublished
                      ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}>
                  {seatingPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {publishLoading ? 'Saving...' : seatingPublished ? 'Seating Published' : 'Seating Hidden'}
                </button>

                {/* New Table */}
                <button onClick={openCreateTable}
                  className="flex items-center gap-2 px-4 py-2 bg-[#722F37] hover:bg-[#5A2328] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition">
                  <Plus className="w-3.5 h-3.5" /> Add Table
                </button>
              </div>
            </div>

            {/* Info bar */}
            {!seatingPublished && (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Seating assignments are currently hidden from guests. Click "Seating Hidden" to publish.
              </div>
            )}

            {/* Tables grid + Unassigned panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: tables */}
              <div className="lg:col-span-2 space-y-4">
                {tables.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                    <Table2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">No tables yet.</p>
                    <button onClick={openCreateTable} className="mt-4 text-xs text-[#722F37] font-bold hover:underline cursor-pointer">+ Add your first table</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tables.map(tbl => {
                      const occupied = (tbl.attendees || []).length;
                      const pct = Math.round((occupied / tbl.capacity) * 100);
                      const sideClr = SIDE_COLORS[tbl.side || 'Neutral'];
                      const isDragOver = dragTarget === tbl.id;
                      return (
                        <div
                          key={tbl.id}
                          onDragOver={e => handleDragOver(e, tbl.id)}
                          onDragLeave={() => setDragTarget(null)}
                          onDrop={e => handleDrop(e, tbl.id)}
                          className={`bg-white rounded-2xl border-2 p-4 transition ${
                            isDragOver ? 'border-[#722F37] bg-red-50/30 scale-[1.01]' : 'border-gray-200 hover:border-gray-300'
                          } shadow-sm`}
                        >
                          {/* Table header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-playfair font-bold text-gray-800 text-sm">{tbl.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: sideClr.bg, borderColor: sideClr.border, color: sideClr.text }}>{tbl.side || 'Neutral'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openEditTable(tbl)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteTable(tbl.id)} className="p-1 text-gray-300 hover:text-red-500 cursor-pointer" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Capacity bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                              <span>{occupied} / {tbl.capacity} seats</span>
                              <span className={pct >= 100 ? 'text-red-500 font-bold' : pct >= 80 ? 'text-amber-500 font-bold' : 'text-green-600 font-semibold'}>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300" style={{
                                width: `${Math.min(pct, 100)}%`,
                                background: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E'
                              }} />
                            </div>
                          </div>

                          {/* Guests at this table */}
                          {(tbl.attendees || []).length > 0 ? (
                            <div className="space-y-1.5">
                              {/* Group by rsvpId */}
                              {Object.entries(
                                (tbl.attendees || []).reduce((acc, att) => {
                                  const key = att.rsvp?.id || att.id;
                                  if (!acc[key]) acc[key] = { rsvp: att.rsvp, invite: att.rsvp?.invite, attendees: [] };
                                  acc[key].attendees.push(att);
                                  return acc;
                                }, {})
                              ).map(([key, grp]) => (
                                <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                  <div>
                                    <p className="font-semibold text-gray-700">{grp.invite?.familyName || 'Guest'}</p>
                                    <p className="text-gray-400 text-[10px]">{grp.attendees.length} person{grp.attendees.length !== 1 ? 's' : ''}</p>
                                  </div>
                                  <button onClick={() => handleUnassign(grp.rsvp?.id)}
                                    className="p-1 text-gray-300 hover:text-red-400 transition cursor-pointer" title="Remove from table">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl">
                              Drop guests here
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Unassigned guests */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-playfair text-sm font-bold text-gray-700">Unassigned Guests</p>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredUnassigned.length}</span>
                </div>

                {/* Side filter */}
                <div className="flex gap-1 mb-3 flex-wrap">
                  {['All','Bride','Groom','Neutral'].map(s => (
                    <button key={s} onClick={() => setFilterSide(s)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${filterSide===s ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>

                {filteredUnassigned.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                    <Check className="w-8 h-8 text-green-400 mb-2" />
                    <p className="text-xs text-gray-400 font-medium">All guests assigned!</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[520px] pr-0.5">
                    {filteredUnassigned.map(invite => {
                      const rsvp = invite.rsvp;
                      const side = invite.side || 'Neutral';
                      const sideClr = SIDE_COLORS[side];
                      return (
                        <div
                          key={invite.id}
                          draggable
                          onDragStart={e => handleDragStart(e, rsvp.id)}
                          className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-[#722F37]/30 hover:bg-red-50/20 transition group select-none"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{invite.familyName}</p>
                            <p className="text-[10px] text-gray-400">{rsvp?.attendees?.length || rsvp?.attendanceCount || '?'} guest{(rsvp?.attendanceCount||1) !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0" style={{ background: sideClr.bg, borderColor: sideClr.border, color: sideClr.text }}>{side}</span>

                          {/* Mobile dropdown fallback */}
                          {tables.length > 0 && (
                            <select
                              onChange={e => { if (e.target.value) handleAssignToTable(rsvp.id, parseInt(e.target.value)); }}
                              defaultValue=""
                              disabled={assigningId === rsvp.id}
                              className="opacity-0 group-hover:opacity-100 max-w-[80px] text-[10px] border border-gray-200 rounded-lg px-1 py-1 bg-white text-gray-600 focus:outline-none focus:border-[#722F37] transition-opacity cursor-pointer"
                            >
                              <option value="">Assign…</option>
                              {tables.map(t => (
                                <option key={t.id} value={t.id} disabled={(t.attendees||[]).length >= t.capacity}>
                                  {t.name} ({(t.attendees||[]).length}/{t.capacity})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: GALLERY ══ */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-playfair text-base font-bold text-gray-800">Gallery Moderation ({pendingPhotos.length} pending)</h3>
            </div>
            {pendingPhotos.length === 0 ? (
              <div className="text-center py-20">
                <Image className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 italic">All photos have been moderated.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
                {pendingPhotos.map(photo => (
                  <div key={photo.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                    <img src={photo.imageUrl.startsWith('/uploads') ? `${BACKEND_URL}${photo.imageUrl}` : photo.imageUrl}
                      alt="" className="w-full aspect-square object-cover" />
                    <div className="p-4">
                      <p className="text-xs font-bold text-gray-700 mb-0.5">By: {photo.uploadedBy}</p>
                      <p className="text-[10px] text-gray-400 mb-3">{photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : ''}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleModeratePhoto(photo.id, 'approve')}
                          className="py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer">
                          <Check className="w-3.5 h-3.5" /> APPROVE
                        </button>
                        <button onClick={() => handleModeratePhoto(photo.id, 'reject')}
                          className="py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer">
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

        {/* ══ TAB: DONATIONS ══ */}
        {activeTab === 'donations' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-playfair text-base font-bold text-gray-800">Financial Support History ({donations.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="px-6 py-3.5">Donor</th>
                    <th className="px-6 py-3.5">Amount (NGN)</th>
                    <th className="px-6 py-3.5">Reference</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-800">{d.donorName || 'Anonymous'}</td>
                      <td className="px-6 py-4 font-bold text-amber-600">₦{d.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-[10px]">{d.reference}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{d.status}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ══ TABLE CREATE/EDIT MODAL ══ */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-playfair text-base font-bold text-gray-800">
                {editingTableId ? 'Edit Table' : 'Add New Table'}
              </h3>
              <button onClick={() => setShowTableModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Table Name</label>
                <input type="text" placeholder="e.g. Table A1 or VIP Table 1" value={tableName} onChange={e => setTableName(e.target.value)} required
                  className="w-full bg-[#FCFCFD] border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#722F37] transition" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Capacity</label>
                <div className="flex gap-2">
                  {[6, 8, 10, 12].map(cap => (
                    <button key={cap} type="button" onClick={() => setTableCapacity(cap)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${tableCapacity===cap ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Side</label>
                <div className="flex gap-2">
                  {['Bride','Groom','Neutral'].map(s => (
                    <button key={s} type="button" onClick={() => setTableSide(s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${tableSide===s ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {tableMsg && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">{tableMsg}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowTableModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-[#722F37] hover:bg-[#5A2328] text-white font-bold text-sm rounded-xl transition shadow-sm cursor-pointer">
                  {editingTableId ? 'Save Changes' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
