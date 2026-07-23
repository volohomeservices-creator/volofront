'use client';
 
import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, CheckCircle, ToggleLeft, ToggleRight, Trash2, Tag, Layers, ImageIcon } from 'lucide-react';
import StatCard from '@/components/admin/dashboard/StatCard';
import DataTable, { Column } from '@/components/admin/shared/DataTable';
import StatusBadge from '@/components/admin/shared/StatusBadge';
 
interface MobileBanner {
  id: string;
  title: string;
  subtitle: string;
  discount_label: string;
  action_url: string | null;
  background_color: string;
  image_name: string;
  active: boolean;
  created_at: string;
}
 
export default function AdminMobileBannersPage() {
  const [banners, setBanners] = useState<MobileBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  // Form state
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    discount_label: 'OFFER',
    action_url: '',
    background_color: '#6366f1',
    image_name: 'home_services_banner.png',
  });
 
  async function fetchBanners() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
 
  useEffect(() => { 
    fetchBanners(); 
  }, []);
 
  const handleCreate = async () => {
    if (!form.title || !form.subtitle) { 
      setError('Title and Subtitle are required.'); 
      return; 
    }
    setSaving(true); 
    setError(null);
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setShowCreate(false);
      setForm({
        title: '',
        subtitle: '',
        discount_label: 'OFFER',
        action_url: '',
        background_color: '#6366f1',
        image_name: 'home_services_banner.png',
      });
      fetchBanners();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
 
  const toggleActive = async (row: MobileBanner) => {
    try {
      await fetch(`/api/admin/banners/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };
 
  const deleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo banner?')) return;
    try {
      await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };
 
  // Stats
  const activeCount = banners.filter(b => b.active).length;
  const inactiveCount = banners.filter(b => !b.active).length;
 
  // Table Columns
  const columns: Column<MobileBanner>[] = [
    {
      key: 'title',
      header: 'Promo Banner Details',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-[9px] uppercase tracking-wider" 
            style={{ backgroundColor: row.background_color }}
          >
            {row.discount_label}
          </div>
          <div>
            <p className="font-extrabold text-white text-sm">{row.title}</p>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">{row.subtitle}</p>
          </div>
        </div>
      )
    },
    {
      key: 'discount_label',
      header: 'Label Tag',
      render: (row) => (
        <span className="font-mono text-slate-300 font-extrabold uppercase text-[10px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          {row.discount_label}
        </span>
      )
    },
    {
      key: 'image_name',
      header: 'Asset Name',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="font-mono">{row.image_name}</span>
        </div>
      )
    },
    {
      key: 'background_color',
      header: 'Hex Accent',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: row.background_color }} />
          <span className="font-mono text-xs text-slate-400 select-all">{row.background_color}</span>
        </div>
      )
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.active ? 'ACTIVE' : 'FAILED'} />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleActive(row)}
            title={row.active ? 'Deactivate' : 'Activate'}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {row.active ? <ToggleRight className="w-6 h-6 text-[#FF8A00]" /> : <ToggleLeft className="w-6 h-6 text-slate-650" />}
          </button>
          <button
            onClick={() => deleteBanner(row.id)}
            className="text-slate-550 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      )
    }
  ];
 
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#1F2937]/50 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white select-none flex items-center gap-2.5">
            <Layers className="w-6.5 h-6.5 text-[#FF8A00]" />
            Mobile App Banners
          </h1>
          <p className="text-slate-450 text-xs select-none">Configure dynamic carousels, target links, and promotional offer slides on the mobile dashboard.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#FF8A00] hover:bg-[#E07A00] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#FF8A00]/10 cursor-pointer active:scale-95 duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Mobile Offer
        </button>
      </div>
 
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Promo Banners"
          value={banners.length}
          icon={<Layers className="h-5 w-5" />}
          color="violet"
          description="Offer card designs"
        />
        <StatCard
          title="Active Slides"
          value={activeCount}
          icon={<CheckCircle className="h-5 w-5" />}
          color="emerald"
          trend={{ value: 'Live', isPositive: true }}
          description="Visible to mobile clients"
        />
        <StatCard
          title="Out of Service"
          value={inactiveCount}
          icon={<ToggleLeft className="h-5 w-5" />}
          color="rose"
          description="Draft or deactivated offers"
        />
      </div>
 
      {/* Table Wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-450 space-y-3 bg-[#111827] border border-[#1F2937] rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
          <span className="text-xs font-bold uppercase tracking-widest font-mono">Fetching active campaigns...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={banners}
          emptyMessage="No mobile promotion slides configured."
        />
      )}
 
      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1F2937] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#FF8A00]" />
                Configure Mobile Offer Card
              </h3>
              <button 
                onClick={() => setShowCreate(false)} 
                className="p-1 hover:bg-[#172033] rounded text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
 
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}
 
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono">Banner Big Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Flat 20% off"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-bold"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono">Subtitle description *</label>
                <input
                  value={form.subtitle}
                  onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
                  placeholder="e.g. Deep Home Cleaning services"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-semibold"
                />
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono">Label Tag (e.g. OFFER)</label>
                <input
                  value={form.discount_label}
                  onChange={e => setForm(p => ({ ...p, discount_label: e.target.value.toUpperCase() }))}
                  placeholder="OFFER"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-bold font-mono"
                />
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono">Background Color Accent</label>
                <input
                  value={form.background_color}
                  onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))}
                  placeholder="#6366f1"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-bold font-mono"
                />
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-455 tracking-widest font-mono">Asset Image Name</label>
                <input
                  value={form.image_name}
                  onChange={e => setForm(p => ({ ...p, image_name: e.target.value }))}
                  placeholder="home_services_banner.png"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-semibold font-mono"
                />
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-455 tracking-widest font-mono">Action Category ID (optional)</label>
                <input
                  value={form.action_url}
                  onChange={e => setForm(p => ({ ...p, action_url: e.target.value }))}
                  placeholder="UUID to redirect to"
                  className="w-full bg-[#070B14] border border-[#1F2937] focus:border-[#FF8A00]/55 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-semibold font-mono"
                />
              </div>
            </div>
 
            <div className="flex gap-3 pt-4 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 bg-transparent border border-[#1F2937] hover:bg-[#172033] rounded-xl transition-all cursor-pointer select-none active:scale-95 duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-[#FF8A00] hover:bg-[#E07A00] disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF8A00]/10 select-none active:scale-95 duration-150"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Add Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
