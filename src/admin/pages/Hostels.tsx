import { useEffect, useState, useCallback } from 'react';
import { Plus, Home, Pencil, Trash2, X, Upload, Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import { SectionHeader, LoadingState, EmptyState, ErrorState, Pagination, FilterSelect, Card } from '../components';
import { getPublicStoragePath, removeImage, uploadImage, validateImage } from '../upload';

interface HostelRow {
  id: string; name: string; type: 'male' | 'female' | 'mixed'; description: string | null;
  cover_image_url: string | null; created_at: string; university_id: string;
  room_type: string | null; capacity: number | null; location: string | null;
  status: 'active' | 'archived';
  university_name?: string; avg_overall?: number; review_count?: number;
  facilities?: string[];
}

interface HostelQueryRow extends HostelRow {
  universities: { name: string } | null;
}

interface ReviewScoreRow {
  overall: number;
}

const PAGE_SIZE = 10;
const FACILITIES = ['wifi', 'food', 'water', 'security', 'laundry', 'ac', 'gym', 'parking', 'cctv', 'common_room'];
const FACILITY_LABELS: Record<string, string> = {
  wifi: 'WiFi', food: 'Food / Mess', water: 'Water', security: 'Security',
  laundry: 'Laundry', ac: 'AC', gym: 'Gym', parking: 'Parking', cctv: 'CCTV', common_room: 'Common Room',
};

export default function Hostels() {
  const { toast } = useToast();
  const [rows, setRows] = useState<HostelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uniFilter, setUniFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HostelRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostelRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);

  const fetchHostels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('hostels').select('*, universities(name)').order('created_at', { ascending: false });
    if (error) { setError('Failed to load hostels'); setLoading(false); return; }

    const enriched = await Promise.all(((data || []) as HostelQueryRow[]).map(async h => {
      const [revsRes, facRes] = await Promise.all([
        supabase.from('reviews').select('overall').eq('hostel_id', h.id),
        supabase.from('hostel_facilities').select('facility').eq('hostel_id', h.id).eq('value', true),
      ]);
      const reviewRows = (revsRes.data || []) as ReviewScoreRow[];
      const count = reviewRows.length;
      const avg = count ? reviewRows.reduce((sum, review) => sum + review.overall, 0) / count : 0;
      const facilities = (facRes.data || []).map(f => f.facility);
      return { ...h, university_name: h.universities?.name, review_count: count, avg_overall: avg, facilities };
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHostels();
    supabase.from('universities').select('id, name').order('name').then(({ data }) => setUniversities(data || []));
  }, [fetchHostels]);

  const filtered = rows.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchUni = uniFilter === 'all' || r.university_id === uniFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchType && matchUni && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('hostels').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast(
        error.code === '23503'
          ? 'This hostel has reviews. Remove or reassign those reviews before deleting it.'
          : 'Failed to delete hostel',
        'error',
      );
    }
    else { toast('Hostel deleted successfully'); setDeleteTarget(null); fetchHostels(); }
  };

  return (
    <div>
      <SectionHeader
        title="Hostels"
        subtitle={`${rows.length} total hostels`}
        action={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#950606] hover:bg-[#7a0404] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Hostel
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search hostels…" className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[14px] font-medium border bg-white"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          />
        </div>
        <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }}
          options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
        <FilterSelect value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }}
          options={[{ value: 'all', label: 'All Types' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'mixed', label: 'Mixed' }]} />
        <FilterSelect value={uniFilter} onChange={v => { setUniFilter(v); setPage(1); }}
          options={[{ value: 'all', label: 'All Universities' }, ...universities.map(u => ({ value: u.id, label: u.name }))]} />
      </div>

      {loading ? (
        <LoadingState label="Loading hostels…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <Card className="py-8"><EmptyState icon={Home} title="No hostels found" message="Add your first hostel to get started" /></Card>
      ) : (
        <>
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Hostel</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">University</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Facilities</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Rating</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Reviews</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Created</th>
                  <th className="text-right px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(h => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-black/[0.02] transition-colors" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#F5F5F4] flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4 text-[#737373]" />
                        </div>
                        <span className="text-[14px] font-bold text-[#0A0A0A]">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[14px] text-[#525252] font-medium">{h.university_name || '—'}</td>
                    <td className="px-5 py-3.5"><span className="text-[12px] font-bold capitalize px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)', color: '#525252' }}>{h.type}</span></td>
                    <td className="px-5 py-3.5 text-[12px] text-[#737373] max-w-[200px] truncate">
                      {h.facilities && h.facilities.length > 0
                        ? h.facilities.map(f => FACILITY_LABELS[f] || f).join(', ')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg capitalize"
                        style={{
                          background: h.status === 'active' ? 'rgba(22,163,74,0.08)' : 'rgba(107,114,128,0.08)',
                          color: h.status === 'active' ? '#15803d' : '#4b5563',
                        }}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[14px] font-black text-[#0A0A0A]">{h.avg_overall ? h.avg_overall.toFixed(1) : '—'}</td>
                    <td className="px-5 py-3.5 text-[14px] font-bold text-[#0A0A0A]">{h.review_count}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#737373] font-medium">{new Date(h.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(h); setShowForm(true); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
                          <Pencil className="w-4 h-4 text-[#525252]" />
                        </button>
                        <button onClick={() => setDeleteTarget(h)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="md:hidden space-y-3">
            {paged.map(h => (
              <Card key={h.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F4] flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-[#737373]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[#0A0A0A]">{h.name}</p>
                    <p className="text-[13px] text-[#737373]">{h.university_name || '—'}</p>
                  </div>
                  <span className="text-[12px] font-bold capitalize px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)' }}>{h.type}</span>
                </div>
                <div className="flex items-center gap-4 text-[13px] text-[#525252] font-medium mb-3">
                  <span>{h.avg_overall ? h.avg_overall.toFixed(1) : '—'} rating</span>
                  <span>{h.review_count} reviews</span>
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold capitalize"
                    style={{
                      background: h.status === 'active' ? 'rgba(22,163,74,0.08)' : 'rgba(107,114,128,0.08)',
                      color: h.status === 'active' ? '#15803d' : '#4b5563',
                    }}>
                    {h.status}
                  </span>
                </div>
                {h.facilities && h.facilities.length > 0 && (
                  <div className="text-[12px] text-[#A3A3A3] mb-3">
                    {h.facilities.map(f => FACILITY_LABELS[f] || f).join(', ')}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(h); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-black/5 text-[13px] font-bold text-[#0A0A0A]">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget(h)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 text-[13px] font-bold text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      {showForm && (
        <HostelForm
          editing={editing}
          universities={universities}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchHostels(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Hostel?"
        message={<>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? To protect review history, deletion is blocked while reviews are attached to this hostel.</>}
        confirmLabel="Delete Hostel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

// ─── Hostel Form ─────────────────────────────
function HostelForm({ editing, universities, onClose, onSaved }: { editing: HostelRow | null; universities: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: editing?.name || '',
    university_id: editing?.university_id || '',
    type: editing?.type || 'mixed',
    description: editing?.description || '',
    location: editing?.location || '',
    room_type: editing?.room_type || '',
    capacity: editing?.capacity?.toString() || '',
    status: editing?.status || 'active',
  });
  const [facilities, setFacilities] = useState<Set<string>>(new Set());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(editing?.cover_image_url || '');
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      supabase.from('hostel_facilities').select('facility').eq('hostel_id', editing.id).then(({ data }) => {
        setFacilities(new Set((data || []).map(f => f.facility)));
      });
    }
  }, [editing]);

  const handleImage = (file: File | null) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) { toast(err, 'error'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  };

  const toggleFacility = (f: string) => {
    setFacilities(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Hostel name is required'); return; }
    if (!form.university_id) { setFormError('Please select a university'); return; }

    setSaving(true);
    setFormError(null);

    let uploadedPath: string | null = null;
    let persisted = false;
    try {
      const id = editing?.id || crypto.randomUUID();
      const existingCoverUrl = editing?.cover_image_url || null;
      let coverUrl = imageRemoved ? null : existingCoverUrl;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        uploadedPath = `${id}/cover.${ext}`;
        coverUrl = await uploadImage('hostel-covers', uploadedPath, imageFile);
      }

      const payload = {
        name: form.name.trim(),
        university_id: form.university_id,
        type: form.type,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        room_type: form.room_type.trim() || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        cover_image_url: coverUrl,
        status: form.status,
      };

      let hostelId = editing?.id;

      if (editing) {
        const { error } = await supabase.from('hostels').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('hostels').insert({ id, ...payload }).select().single();
        if (error) throw error;
        hostelId = data.id;
      }
      persisted = true;

      // Sync facilities
      if (hostelId) {
        const { error: deleteFacilitiesError } = await supabase.from('hostel_facilities').delete().eq('hostel_id', hostelId);
        if (deleteFacilitiesError) throw deleteFacilitiesError;
        const facRows = Array.from(facilities).map(f => ({ hostel_id: hostelId, facility: f, value: true }));
        if (facRows.length) {
          const { error: insertFacilitiesError } = await supabase.from('hostel_facilities').insert(facRows);
          if (insertFacilitiesError) throw insertFacilitiesError;
        }
      }

      if (existingCoverUrl && existingCoverUrl !== coverUrl) {
        const oldPath = getPublicStoragePath('hostel-covers', existingCoverUrl);
        if (oldPath) {
          try {
            await removeImage('hostel-covers', oldPath);
          } catch (cleanupError) {
            console.warn('Hostel cover cleanup failed:', cleanupError);
          }
        }
      }

      toast(editing ? 'Hostel updated successfully' : 'Hostel created successfully');
      onSaved();
    } catch (err) {
      if (uploadedPath && !persisted) {
        void removeImage('hostel-covers', uploadedPath).catch(cleanupError =>
          console.warn('Failed to clean up an unsaved hostel cover:', cleanupError),
        );
      }
      setFormError(err instanceof Error ? err.message : 'Failed to save hostel. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-white rounded-[24px] p-7 animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-black text-[#0A0A0A] tracking-[-0.02em]">{editing ? 'Edit Hostel' : 'Add Hostel'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"><X className="w-5 h-5 text-[#737373]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Cover Image</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#F5F5F4] flex items-center justify-center shrink-0" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-cover" /> : <Home className="w-8 h-8 text-[#A3A3A3]" />}
              </div>
              <div className="flex-1">
                <button type="button" onClick={() => document.getElementById('hostel-cover-input')?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border hover:bg-black/5 transition-colors" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                  <Upload className="w-4 h-4" />{imagePreview ? 'Replace' : 'Upload'}
                </button>
                {imagePreview && <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setImageRemoved(true); }} className="ml-2 text-[13px] font-semibold text-red-600 hover:underline">Remove</button>}
                <p className="text-[12px] text-[#A3A3A3] mt-1.5">JPG, PNG, or WebP · max 5MB</p>
              </div>
              <input id="hostel-cover-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleImage(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Hostel Name <span className="text-[#950606]">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Hall 1" className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">University <span className="text-[#950606]">*</span></label>
              <select value={form.university_id} onChange={e => setForm(f => ({ ...f, university_id: e.target.value }))} className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <option value="">Select university…</option>
                {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Hostel Type <span className="text-[#950606]">*</span></label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as HostelRow['type'] }))} className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Room Type</label>
              <input type="text" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))} placeholder="e.g. Single, Shared" className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 200" className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Address / Location</label>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'archived' }))} className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" rows={3} className="w-full rounded-xl px-4 py-3 text-[14px] border bg-[#FAFAF9] resize-none" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-3">Facilities</label>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map(f => (
                <button key={f} type="button" onClick={() => toggleFacility(f)}
                  className="px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all"
                  style={{
                    background: facilities.has(f) ? 'rgba(149,6,6,0.08)' : 'rgba(0,0,0,0.03)',
                    color: facilities.has(f) ? '#950606' : '#737373',
                    border: `1px solid ${facilities.has(f) ? 'rgba(149,6,6,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                  {FACILITY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {formError && <div className="px-4 py-3 rounded-xl text-[13px] font-medium text-red-700" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>{formError}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#525252] hover:bg-black/5 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#950606] hover:bg-[#7a0404] transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Hostel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
