import { useEffect, useState } from 'react';
import { Building2, Home, Star, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatCard, SectionHeader, LoadingState, Card } from '../components';
import type { DashboardStats } from '../types';

type NameRelation = { name?: string | null } | null;

interface RecentReview {
  id: string;
  user_name: string | null;
  reviewer_name: string | null;
  body: string | null;
  overall: number;
  hostels?: NameRelation;
  universities?: NameRelation;
}

interface RecentUniversity {
  name: string;
  short_name: string | null;
  created_at: string;
}

interface RecentHostel {
  name: string;
  type: string;
  created_at: string;
  universities?: NameRelation;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [recentUnis, setRecentUnis] = useState<RecentUniversity[]>([]);
  const [recentHostels, setRecentHostels] = useState<RecentHostel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: uniCount },
      { count: hostelCount },
      { count: reviewCount },
      { count: userCount },
      { count: reviewsWeek },
      { count: newUnis },
      { count: newHostels },
      { data: reviews },
      { data: unis },
      { data: hostels },
    ] = await Promise.all([
      supabase.from('universities').select('*', { count: 'exact', head: true }),
      supabase.from('hostels').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('universities').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('hostels').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('reviews').select('*, hostels(name), universities(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('universities').select('name,short_name,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('hostels').select('name,type,created_at,universities(name)').order('created_at', { ascending: false }).limit(5),
    ]);

    setStats({
      totalUniversities: uniCount || 0,
      totalHostels: hostelCount || 0,
      totalReviews: reviewCount || 0,
      totalUsers: userCount || 0,
      reviewsThisWeek: reviewsWeek || 0,
      newUniversities: newUnis || 0,
      newHostels: newHostels || 0,
    });
    setRecentReviews((reviews || []) as RecentReview[]);
    setRecentUnis((unis || []) as RecentUniversity[]);
    setRecentHostels((hostels || []) as RecentHostel[]);
    setLoading(false);
  }

  if (loading) return <LoadingState label="Loading dashboard…" />;

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Overview of your platform" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Universities" value={stats?.totalUniversities ?? 0} delay={0} />
        <StatCard icon={Home} label="Hostels" value={stats?.totalHostels ?? 0} delay={60} />
        <StatCard icon={Star} label="Reviews" value={stats?.totalReviews ?? 0} delay={120} />
        <StatCard icon={Users} label="Users" value={stats?.totalUsers ?? 0} delay={180} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} label="Reviews This Week" value={stats?.reviewsThisWeek ?? 0} color="#15803d" delay={240} />
        <StatCard icon={Building2} label="New Universities" value={stats?.newUniversities ?? 0} color="#15803d" delay={300} />
        <StatCard icon={Home} label="New Hostels" value={stats?.newHostels ?? 0} color="#15803d" delay={360} />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent reviews */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-[18px] h-[18px] text-[#950606]" />
            <h3 className="text-[15px] font-black text-[#0A0A0A]">Recent Reviews</h3>
          </div>
          {recentReviews.length === 0 ? (
            <p className="text-[14px] text-[#A3A3A3]">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {recentReviews.map(r => (
                <div key={r.id} className="flex items-start gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{r.user_name || r.reviewer_name || 'Anonymous'}</p>
                    <p className="text-[12px] text-[#737373] truncate">{r.hostels?.name || r.universities?.name || 'Unknown'}</p>
                    <p className="text-[12px] text-[#A3A3A3] line-clamp-1 mt-0.5">{r.body || 'No comment'}</p>
                  </div>
                  <span className="text-[13px] font-black text-[#950606] shrink-0">{r.overall}/5</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent universities */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-[18px] h-[18px] text-[#950606]" />
            <h3 className="text-[15px] font-black text-[#0A0A0A]">New Universities</h3>
          </div>
          {recentUnis.length === 0 ? (
            <p className="text-[14px] text-[#A3A3A3]">None yet</p>
          ) : (
            <div className="space-y-3">
              {recentUnis.map(u => (
                <div key={u.name + u.created_at} className="flex items-center gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                  <div className="w-8 h-8 rounded-lg bg-[#950606] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {u.short_name?.slice(0, 3) || 'UNI'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{u.name}</p>
                    <p className="text-[12px] text-[#A3A3A3]">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent hostels */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-[18px] h-[18px] text-[#950606]" />
            <h3 className="text-[15px] font-black text-[#0A0A0A]">New Hostels</h3>
          </div>
          {recentHostels.length === 0 ? (
            <p className="text-[14px] text-[#A3A3A3]">None yet</p>
          ) : (
            <div className="space-y-3">
              {recentHostels.map(h => (
                <div key={h.name + h.created_at} className="flex items-center gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-[#737373]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{h.name}</p>
                    <p className="text-[12px] text-[#A3A3A3] truncate">{h.universities?.name || 'Unknown'}</p>
                  </div>
                  <span className="text-[11px] font-bold capitalize text-[#737373] shrink-0">{h.type}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
