import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Building2, Pencil, Trash2, X, Upload, Loader2, Search, Star, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import { SectionHeader, LoadingState, EmptyState, ErrorState, Pagination, FilterSelect, Card } from '../components';
import { getPublicStoragePath, removeImage, uploadImage, validateImage } from '../upload';

interface UniRow {
  id: string; name: string; short_name: string; location: string; country: string;
  description: string | null; cover_image_url: string | null; image_url: string | null;
  photos?: string[] | null;
  slug: string; website_url: string | null; address: string | null; created_at: string;
  status: 'active' | 'archived';
  hostel_count?: number; review_count?: number;
}

const PAGE_SIZE = 10;

export default function Universities() {
  const { toast } = useToast();
  const [rows, setRows] = useState<UniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UniRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUnis = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('universities').select('*').order('created_at', { ascending: false });
    if (error) { setError('Failed to load universities'); setLoading(false); return; }

    const enriched = await Promise.all((data || []).map(async (u: UniRow) => {
      const { count: hostelCount } = await supabase.from('hostels').select('*', { count: 'exact', head: true }).eq('university_id', u.id);
      const { data: hostels } = await supabase.from('hostels').select('id').eq('university_id', u.id);
      const ids = (hostels || []).map(h => h.id);
      let reviewCount = 0;
      if (ids.length) {
        const { count } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('hostel_id', ids);
        reviewCount = count || 0;
      }
      return { ...u, hostel_count: hostelCount || 0, review_count: reviewCount };
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUnis(); }, [fetchUnis]);

  const countries = ['all', ...Array.from(new Set(rows.map(r => r.country)))];

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.short_name.toLowerCase().includes(search.toLowerCase());
    const matchCountry = country === 'all' || r.country === country;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchCountry && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('universities').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast(
        error.code === '23503'
          ? 'This university has hostels or reviews. Remove or move those records before deleting it.'
          : 'Failed to delete university',
        'error',
      );
    } else {
      toast('University deleted successfully');
      setDeleteTarget(null);
      fetchUnis();
    }
  };

  return (
    <div>
      <SectionHeader
        title="Universities"
        subtitle={`${rows.length} total universities`}
        action={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#950606] hover:bg-[#7a0404] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add University
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search universities…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[14px] font-medium border bg-white"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
        <FilterSelect
          value={country}
          onChange={v => { setCountry(v); setPage(1); }}
          options={countries.map(c => ({ value: c, label: c === 'all' ? 'All Countries' : c }))}
        />
      </div>

      {/* Table / Cards */}
      {loading ? (
        <LoadingState label="Loading universities…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <Card className="py-8"><EmptyState icon={Building2} title="No universities found" message="Add your first university to get started" /></Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">University</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">City</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Country</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Hostels</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Reviews</th>
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Created</th>
                  <th className="text-right px-5 py-3 text-[12px] font-bold text-[#737373] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => {
                  const cover = u.cover_image_url || (u.photos && u.photos[0]) || u.image_url;
                  const photoCount = u.photos?.length || (cover ? 1 : 0);
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-black/[0.02] transition-colors" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-black/5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#950606] flex items-center justify-center text-white text-[11px] font-black shrink-0">
                              {u.short_name?.slice(0, 3) || 'UNI'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[14px] font-bold text-[#0A0A0A] block truncate">{u.name}</span>
                            <span className="text-[11px] text-[#737373] flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-[#A3A3A3]" />
                              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-[#525252] font-medium">{u.location}</td>
                      <td className="px-5 py-3.5 text-[14px] text-[#525252] font-medium">{u.country}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg capitalize"
                          style={{
                            background: u.status === 'active' ? 'rgba(22,163,74,0.08)' : 'rgba(107,114,128,0.08)',
                            color: u.status === 'active' ? '#15803d' : '#4b5563',
                          }}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] font-bold text-[#0A0A0A]">{u.hostel_count}</td>
                      <td className="px-5 py-3.5 text-[14px] font-bold text-[#0A0A0A]">{u.review_count}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#737373] font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(u); setShowForm(true); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4 text-[#525252]" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paged.map(u => {
              const cover = u.cover_image_url || (u.photos && u.photos[0]) || u.image_url;
              const photoCount = u.photos?.length || (cover ? 1 : 0);
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-black/5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#950606] flex items-center justify-center text-white text-[11px] font-black shrink-0">
                        {u.short_name?.slice(0, 3) || 'UNI'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-[#0A0A0A] truncate">{u.name}</p>
                      <p className="text-[13px] text-[#737373]">{u.location}, {u.country}</p>
                      <span className="text-[11px] text-[#737373] flex items-center gap-1 mt-0.5">
                        <ImageIcon className="w-3 h-3 text-[#A3A3A3]" />
                        {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[13px] text-[#525252] font-medium mb-3">
                    <span>{u.hostel_count} hostels</span>
                    <span>{u.review_count} reviews</span>
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold capitalize"
                      style={{
                        background: u.status === 'active' ? 'rgba(22,163,74,0.08)' : 'rgba(107,114,128,0.08)',
                        color: u.status === 'active' ? '#15803d' : '#4b5563',
                      }}>
                      {u.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(u); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-black/5 text-[13px] font-bold text-[#0A0A0A]">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(u)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 text-[13px] font-bold text-red-600">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <UniversityForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchUnis(); }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete University?"
        message={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            To protect related data, deletion is blocked while this university still has hostels or reviews.
            Move or remove those records first.
          </>
        }
        confirmLabel="Delete University"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

interface PhotoItem {
  id: string;
  url: string;
  isNew?: boolean;
  file?: File;
}

// ─── University Form ─────────────────────────
function UniversityForm({ editing, onClose, onSaved }: { editing: UniRow | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: editing?.name || '',
    short_name: editing?.short_name || '',
    country: editing?.country || '',
    location: editing?.location || '',
    address: editing?.address || '',
    description: editing?.description || '',
    website_url: editing?.website_url || '',
    status: editing?.status || 'active',
  });

  const [photosList, setPhotosList] = useState<PhotoItem[]>(() => {
    if (editing?.photos && editing.photos.length > 0) {
      return editing.photos.map((url, idx) => ({ id: `existing-${idx}-${url}`, url }));
    }
    const cover = editing?.cover_image_url || editing?.image_url;
    if (cover) {
      return [{ id: 'existing-cover', url: cover }];
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: PhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const err = validateImage(file);
      if (err) {
        toast(`${file.name}: ${err}`, 'error');
        continue;
      }
      newItems.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: URL.createObjectURL(file),
        isNew: true,
        file,
      });
    }

    if (newItems.length > 0) {
      setPhotosList(prev => [...prev, ...newItems]);
    }
  };

  const removePhoto = (id: string) => {
    setPhotosList(prev => prev.filter(p => p.id !== id));
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    setPhotosList(prev => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('University name is required'); return; }
    if (!form.country.trim()) { setFormError('Country is required'); return; }
    if (!form.location.trim()) { setFormError('City / Location is required'); return; }
    if (form.website_url.trim()) {
      try {
        const url = new URL(form.website_url.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        setFormError('Website URL must begin with http:// or https://');
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    const uploadedNewPaths: string[] = [];
    let persisted = false;

    try {
      const id = editing?.id || crypto.randomUUID();

      // Upload newly added photo files to Supabase Storage
      const finalPhotoUrls: string[] = [];
      for (const item of photosList) {
        if (item.isNew && item.file) {
          const ext = item.file.name.split('.').pop() || 'jpg';
          const path = `${id}/photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          uploadedNewPaths.push(path);
          const publicUrl = await uploadImage('university-covers', path, item.file);
          finalPhotoUrls.push(publicUrl);
        } else {
          finalPhotoUrls.push(item.url);
        }
      }

      const primaryCover = finalPhotoUrls[0] || null;

      const payload = {
        name: form.name.trim(),
        short_name: form.short_name.trim() || form.name.slice(0, 6).toUpperCase(),
        country: form.country.trim(),
        location: form.location.trim(),
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        cover_image_url: primaryCover,
        image_url: primaryCover,
        photos: finalPhotoUrls,
        slug: slugify(form.name),
        status: form.status,
      };

      if (editing) {
        let { error } = await supabase.from('universities').update(payload).eq('id', editing.id);
        // Fallback gracefully if remote schema doesn't yet have 'photos' column
        if (error && (error.code === '42703' || error.message?.includes('photos'))) {
          const { photos: _, ...fallbackPayload } = payload;
          const res = await supabase.from('universities').update(fallbackPayload).eq('id', editing.id);
          error = res.error;
        }
        if (error) throw error;
      } else {
        let { error } = await supabase.from('universities').insert({ id, ...payload });
        // Fallback gracefully if remote schema doesn't yet have 'photos' column
        if (error && (error.code === '42703' || error.message?.includes('photos'))) {
          const { photos: _, ...fallbackPayload } = payload;
          const res = await supabase.from('universities').insert({ id, ...fallbackPayload });
          error = res.error;
        }
        if (error) throw error;
      }
      persisted = true;

      // Clean up removed old photos from Supabase Storage asynchronously
      const oldPhotos = editing?.photos || (editing?.cover_image_url ? [editing.cover_image_url] : []);
      const removedOldPhotos = oldPhotos.filter(oldUrl => !finalPhotoUrls.includes(oldUrl));
      for (const oldUrl of removedOldPhotos) {
        const oldPath = getPublicStoragePath('university-covers', oldUrl);
        if (oldPath) {
          removeImage('university-covers', oldPath).catch(cleanupErr =>
            console.warn('Storage cleanup failed for:', oldPath, cleanupErr),
          );
        }
      }

      toast(editing ? 'University updated successfully' : 'University created successfully');
      onSaved();
    } catch (err) {
      // Clean up newly uploaded files if DB insert/update failed
      if (!persisted && uploadedNewPaths.length > 0) {
        for (const p of uploadedNewPaths) {
          void removeImage('university-covers', p).catch(() => {});
        }
      }
      setFormError(err instanceof Error ? err.message : 'Failed to save university. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[660px] max-h-[90vh] overflow-y-auto bg-white rounded-[24px] p-7 animate-scaleIn shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-black text-[#0A0A0A] tracking-[-0.02em]">
              {editing ? 'Edit University' : 'Add University'}
            </h2>
            <p className="text-[13px] text-[#737373] mt-0.5">
              Fill in details and upload university photos
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center">
            <X className="w-5 h-5 text-[#737373]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos Management */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <label className="block text-[13px] font-bold text-[#0A0A0A]">
                  Photos ({photosList.length})
                </label>
                <p className="text-[12px] text-[#737373]">
                  First photo will be used as the primary cover. Upload one or more photos (JPG, PNG, WebP up to 5MB).
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold text-[#950606] bg-[#950606]/10 hover:bg-[#950606]/15 transition-colors shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                Add Photos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => {
                  handleFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
            </div>

            {/* Photos Preview Grid */}
            {photosList.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-black/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#950606]/40 hover:bg-[#950606]/[0.02] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#737373] mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Click to upload photos</p>
                <p className="text-[11px] text-[#A3A3A3] mt-0.5">Select one or multiple images</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#FAFAF9] rounded-2xl border border-black/5">
                {photosList.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-black/5 border border-black/5"
                  >
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Cover badge */}
                    {index === 0 ? (
                      <span className="absolute top-2 left-2 bg-[#950606] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCover(index)}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1"
                        title="Set as primary cover photo"
                      >
                        <Star className="w-3 h-3" /> Set Cover
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add more tile */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-black/15 hover:border-[#950606] hover:bg-[#950606]/5 aspect-[4/3] flex flex-col items-center justify-center gap-1 text-[#737373] hover:text-[#950606] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Add More</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="University Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. University of Nairobi" />
            <Field label="Short Name" value={form.short_name} onChange={v => setForm(f => ({ ...f, short_name: v }))} placeholder="e.g. UON" />
            <Field label="Country" required value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} placeholder="e.g. Kenya" />
            <Field label="City / Location" required value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="e.g. Nairobi" />
            <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Street address" />
            <Field label="Website URL" value={form.website_url} onChange={v => setForm(f => ({ ...f, website_url: v }))} placeholder="https://…" />
            <StatusField value={form.status} onChange={v => setForm(f => ({ ...f, status: v as 'active' | 'archived' }))} />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the university, campus overview, etc…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-[14px] border bg-[#FAFAF9] resize-none"
              style={{ borderColor: 'rgba(0,0,0,0.08)' }}
            />
          </div>

          {formError && (
            <div className="px-4 py-3 rounded-xl text-[13px] font-medium text-red-700 bg-red-50 border border-red-200">
              {formError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#525252] hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#950606] hover:bg-[#7a0404] transition-colors disabled:opacity-60 shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create University'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">
        {label} {required && <span className="text-[#950606]">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      />
    </div>
  );
}

function StatusField({ value, onChange }: { value: 'active' | 'archived'; onChange: (v: 'active' | 'archived') => void }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#0A0A0A] mb-2">Status</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as 'active' | 'archived')}
        className="w-full rounded-xl px-4 py-2.5 text-[14px] border bg-[#FAFAF9]"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}
