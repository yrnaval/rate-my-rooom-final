import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertCircle, Camera, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ReviewFormData } from '../lib/types';
import StarRating from './StarRating';

interface Props {
  hostelId: string;
  onSuccess: () => void;
  onLoginRequired: () => void;
}

type CategoryKey = keyof Pick<ReviewFormData, 'cleanliness' | 'wifi' | 'food' | 'water' | 'security' | 'facilities' | 'value'>;

const CATEGORIES: { key: CategoryKey; label: string; desc: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness',    desc: 'Rooms, bathrooms & common areas' },
  { key: 'wifi',        label: 'WiFi & Internet', desc: 'Speed and reliability' },
  { key: 'food',        label: 'Food',            desc: 'Cafeteria or nearby food options' },
  { key: 'water',       label: 'Water Supply',    desc: 'Hot water, pressure & availability' },
  { key: 'security',    label: 'Security',        desc: 'Safety and access control' },
  { key: 'facilities',  label: 'Facilities',      desc: 'Laundry, common areas, gym, parking' },
  { key: 'value',       label: 'Value for Money', desc: 'Worth what you pay' },
];

const INITIAL: ReviewFormData = {
  hostel_id: '',
  cleanliness: 0, wifi: 0, food: 0, water: 0, security: 0, facilities: 0, value: 0,
  overall: 0, comment: '', stay_period: '',
};

export default function ReviewForm({ hostelId, onSuccess, onLoginRequired }: Props) {
  const { user } = useAuth();
  const [form,       setForm]       = useState<ReviewFormData>({ ...INITIAL, hostel_id: hostelId });
  const [photos,     setPhotos]     = useState<File[]>([]);
  const [previews,   setPreviews]   = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'rgba(149,6,6,0.04)', border: '1.5px dashed rgba(149,6,6,0.2)' }}
      >
        <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(149,6,6,0.3)' }} />
        <h3 className="font-black text-[#0A0A0A] text-[16px] mb-1.5">Share Your Experience</h3>
        <p className="text-[13.5px] text-[#737373] mb-5 font-medium">
          Sign in with Google to write a review and upload photos
        </p>
        <button
          onClick={onLoginRequired}
          className="btn-primary gap-2 text-[14px] px-6 py-3"
        >
          <LogIn className="w-4 h-4" />
          Sign In to Review
        </button>
      </div>
    );
  }

  const setRating = (key: CategoryKey, val: number) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      const keys: CategoryKey[] = ['cleanliness', 'wifi', 'food', 'water', 'security', 'facilities', 'value'];
      const filled = keys.map(k => updated[k] as number).filter(v => v > 0);
      return {
        ...updated,
        overall: filled.length
          ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length)
          : 0,
      };
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).slice(0, 5 - photos.length);
    setPhotos(p  => [...p, ...next]);
    next.forEach(f => setPreviews(p => [...p, URL.createObjectURL(f)]));
  };

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setPhotos(p  => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const validate = (): string | null => {
    const keys: CategoryKey[] = ['cleanliness', 'wifi', 'food', 'water', 'security', 'facilities', 'value'];
    if (keys.some(k => (form[k] as number) === 0)) return 'Please rate all 7 categories';
    if (!form.comment.trim()) return 'Please write a short comment about your stay';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError(null);

    try {
      const name   = (user.user_metadata?.full_name as string) || user.email || 'Anonymous';
      const avatar = (user.user_metadata?.avatar_url as string) || null;

      const { data: review, error: rErr } = await supabase
        .from('reviews')
        .insert({
          hostel_id:       hostelId,
          user_id:         user.id,
          user_name:       name,
          reviewer_name:   name,
          user_avatar:     avatar,
          reviewer_avatar: avatar,
          cleanliness: form.cleanliness,
          wifi:        form.wifi,
          food:        form.food,
          water:       form.water,
          security:    form.security,
          facilities:  form.facilities,
          value:       form.value,
          overall:     form.overall,
          body:        form.comment.trim(),
          stay_period: form.stay_period.trim() || null,
        })
        .select()
        .single();

      if (rErr) throw rErr;

      for (const file of photos) {
        const ext  = file.name.split('.').pop();
        const path = `${user.id}/${review.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('review-photos')
          .upload(path, file, { contentType: file.type });
        if (upErr) continue;
        const { data: { publicUrl } } = supabase.storage
          .from('review-photos').getPublicUrl(path);
        await supabase.from('review_photos').insert({
          review_id: review.id,
          photo_url: publicUrl,
          url:       publicUrl,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        setSuccess(false);
        setForm({ ...INITIAL, hostel_id: hostelId });
        setPhotos([]);
        setPreviews([]);
      }, 1600);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="rounded-2xl p-10 text-center animate-scaleIn"
        style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}
      >
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="font-black text-[#0A0A0A] text-[17px] mb-1">Review Submitted!</h3>
        <p className="text-[13.5px] text-[#737373] font-medium">Thank you for helping fellow students.</p>
      </div>
    );
  }

  const allRated   = ['cleanliness','wifi','food','water','security','facilities','value'].every(k => (form[k as CategoryKey]) > 0);
  const progress   = ['cleanliness','wifi','food','water','security','facilities','value'].filter(k => (form[k as CategoryKey]) > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Progress indicator */}
      {!allRated && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#950606] rounded-full transition-all duration-500"
              style={{ width: `${(progress / 6) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-bold text-[#A3A3A3]">{progress}/6 rated</span>
        </div>
      )}

      {/* Ratings */}
      <div
        className="bg-white rounded-2xl p-5 space-y-4"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <h4 className="font-black text-[15px] text-[#0A0A0A] tracking-[-0.02em] mb-1">Rate Your Stay</h4>
        {CATEGORIES.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#0A0A0A] leading-tight">{label}</p>
              <p className="text-[12px] text-[#A3A3A3] font-medium">{desc}</p>
            </div>
            <div className="shrink-0">
              <StarRating value={form[key] as number} onChange={(v) => setRating(key, v)} />
            </div>
          </div>
        ))}

        {allRated && (
          <div
            className="flex items-center justify-between pt-4 mt-2"
            style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
          >
            <span className="text-[14px] font-bold text-[#525252]">Overall Score</span>
            <div className="flex items-center gap-2.5">
              <StarRating value={form.overall} readonly size="md" />
              <span
                className="text-[17px] font-black"
                style={{ color: form.overall >= 4 ? '#16a34a' : form.overall >= 3 ? '#d97706' : '#dc2626' }}
              >
                {form.overall}/5
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Comment + period */}
      <div
        className="bg-white rounded-2xl p-5 space-y-4"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div>
          <label className="block text-[13.5px] font-bold text-[#0A0A0A] mb-2">
            Your Review <span className="text-[#950606]">*</span>
          </label>
          <textarea
            value={form.comment}
            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            placeholder="Share your honest experience — what was great, what needs improvement…"
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-[14px] text-[#0A0A0A] placeholder-[#A3A3A3] resize-none transition-all focus:outline-none"
            style={{ border: '1.5px solid rgba(0,0,0,0.1)', background: '#FAFAF9' }}
            onFocus={e  => { (e.target as HTMLTextAreaElement).style.borderColor = '#950606'; }}
            onBlur={e   => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>
        <div>
          <label className="block text-[13.5px] font-bold text-[#0A0A0A] mb-2">
            Academic Period <span className="text-[#A3A3A3] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.stay_period}
            onChange={e => setForm(f => ({ ...f, stay_period: e.target.value }))}
            placeholder="e.g. 2023/2024 academic year, Semester 1 2024"
            className="w-full rounded-xl px-4 py-2.5 text-[14px] text-[#0A0A0A] placeholder-[#A3A3A3] transition-all focus:outline-none"
            style={{ border: '1.5px solid rgba(0,0,0,0.1)', background: '#FAFAF9' }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#950606'; }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>
      </div>

      {/* Photos */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <h4 className="font-bold text-[14px] text-[#0A0A0A] mb-4">
          Add Photos
          <span className="text-[12px] font-normal text-[#A3A3A3] ml-2">Optional · up to 5</span>
        </h4>

        {previews.length > 0 && (
          <div className="flex gap-2.5 flex-wrap mb-4">
            {previews.map((url, i) => (
              <div key={i} className="relative group/img">
                <img
                  src={url}
                  alt=""
                  className="w-[72px] h-[72px] object-cover rounded-xl"
                  style={{ border: '1.5px solid rgba(0,0,0,0.08)' }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#950606] rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < 5 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 w-full justify-center rounded-xl py-4 text-[13.5px] font-semibold text-[#737373] transition-all duration-200 hover:text-[#950606]"
            style={{ border: '1.5px dashed rgba(0,0,0,0.15)', background: '#FAFAF9' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(149,6,6,0.3)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(149,6,6,0.02)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF9'; }}
          >
            <Upload className="w-4 h-4" />
            Click to upload photos
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13.5px] font-medium"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full btn-primary py-4 text-[15px] font-black rounded-2xl gap-2.5"
        style={{ opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  );
}
