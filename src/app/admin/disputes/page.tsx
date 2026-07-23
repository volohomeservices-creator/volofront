'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';
import Pagination from '@/components/admin/shared/Pagination';
import LoadingSkeleton from '@/components/admin/shared/LoadingSkeleton';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import SearchInput from '@/components/admin/shared/SearchInput';
import { ShieldAlert, Loader2, CheckCircle2, UserPlus, FileText } from 'lucide-react';
import StatusBadge from '@/components/admin/shared/StatusBadge';

interface DisputeRow {
  id: string;
  booking_id: string;
  type: string;
  description: string;
  status: string;
  resolution_notes: string;
  created_at: string;
  resolved_at: string;
  reporter: { full_name: string; phone: string; role: string };
  admin: { full_name: string };
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  async function fetchDisputes() {
    setLoading(true);
    try {
      const url = `/api/admin/disputes?page=${page}&limit=${limit}&status=${status}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setDisputes(data.disputes || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDisputes();
  }, [page, status, search]);

  const handleAction = async (id: string, action: 'ASSIGN' | 'RESOLVE', notes?: string) => {
    if (action === 'ASSIGN' && !confirm('Assign this dispute to yourself?')) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolutionNotes: notes })
      });
      if (res.ok) {
        setResolveModalOpen(false);
        setResolutionNotes('');
        await fetchDisputes();
      } else {
        alert('Failed to update dispute.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating dispute.');
    } finally {
      setActionLoading(null);
    }
  };

  const columns: Column<DisputeRow>[] = [
    {
      key: 'type',
      header: 'Issue Type',
      render: (row) => <span className="font-bold text-xs uppercase font-mono text-slate-300">{row.type.replace(/_/g, ' ')}</span>
    },
    {
      key: 'reporter',
      header: 'Reported By',
      render: (row) => (
        <div>
          <span className="font-bold block">{row.reporter?.full_name || 'Unknown'}</span>
          <span className="text-[10px] text-slate-500 uppercase">{row.reporter?.role}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <div className="max-w-xs truncate text-xs" title={row.description}>
          {row.description}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'admin',
      header: 'Assigned To',
      render: (row) => <span className="text-xs text-slate-400 font-bold">{row.admin?.full_name || 'Unassigned'}</span>
    },
    {
      key: 'created_at',
      header: 'Reported On',
      render: (row) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'OPEN' && (
            <button
              type="button"
              disabled={actionLoading === row.id}
              onClick={() => handleAction(row.id, 'ASSIGN')}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              {actionLoading === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Assign To Me
            </button>
          )}
          {row.status === 'IN_PROGRESS' && (
            <button
              type="button"
              disabled={actionLoading === row.id}
              onClick={() => {
                setResolvingId(row.id);
                setResolveModalOpen(true);
              }}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" /> Resolve
            </button>
          )}
          {row.status === 'RESOLVED' && (
            <button
              type="button"
              onClick={() => alert(`Resolution Notes:\n${row.resolution_notes || 'None provided.'}`)}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> View Notes
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-200 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/50 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Support & Disputes
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Manage and mediate conflicts between customers and field partners.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-4 bg-[#111827] border border-[#1F2937] p-5 rounded-2xl shadow-xl">
        <div className="w-full lg:max-w-md">
          <SearchInput
            placeholder="Search by Booking ID..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
        <FilterDropdown
          label="Dispute Status"
          value={status}
          onChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Open', value: 'OPEN' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Resolved', value: 'RESOLVED' }
          ]}
        />
      </div>

      {loading ? (
        <LoadingSkeleton rows={10} cols={7} />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={disputes}
            emptyMessage="No active disputes found."
          />
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            totalResults={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResolveModalOpen(false)}></div>
          <div className="relative bg-[#111827] border border-[#1F2937] p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black uppercase text-white mb-4">Resolve Dispute</h3>
            <textarea
              className="w-full h-32 bg-[#0A0F1E] border border-[#1F2937] rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              placeholder="Enter resolution notes and payout adjustments..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-[#1F2937] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading === resolvingId || !resolutionNotes.trim()}
                onClick={() => resolvingId && handleAction(resolvingId, 'RESOLVE', resolutionNotes)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === resolvingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
