export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  review_count?: number;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'dismissed' | 'resolved';
  created_at: string;
  reporter_name?: string;
  reporter_email?: string;
  review?: {
    id: string;
    body: string | null;
    overall: number;
    user_name: string | null;
    hostel_name?: string;
    university_name?: string;
  };
}

export interface HostelFacility {
  hostel_id: string;
  facility: string;
  value: boolean;
}

export type AdminSection =
  | 'dashboard'
  | 'universities'
  | 'hostels'
  | 'reviews'
  | 'users'
  | 'reports'
  | 'settings';

export interface DashboardStats {
  totalUniversities: number;
  totalHostels: number;
  totalReviews: number;
  totalUsers: number;
  reviewsThisWeek: number;
  newUniversities: number;
  newHostels: number;
}

export interface AdminEmail {
  id: string;
  email: string;
  created_at: string;
}
