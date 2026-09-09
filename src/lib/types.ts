export interface University {
  id: string;
  name: string;
  short_name: string;
  location: string;
  country: string;
  logo_url: string | null;
  cover_image_url: string | null;
  image_url: string | null;
  slug: string;
  description: string | null;
  photos?: string[];
  created_at: string;
  hostel_count?: number;
  avg_overall?: number;
}

export interface Hostel {
  id: string;
  university_id: string;
  name: string;
  type: 'male' | 'female' | 'mixed';
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  review_count?: number;
  avg_overall?: number;
  avg_cleanliness?: number;
  avg_wifi?: number;
  avg_food?: number;
  avg_water?: number;
  avg_security?: number;
  avg_value?: number;
  avg_facilities?: number;
}

export interface Review {
  id: string;
  hostel_id: string;
  user_id: string;
  user_name: string | null;
  reviewer_name: string | null;
  user_avatar: string | null;
  reviewer_avatar: string | null;
  cleanliness: number;
  wifi: number;
  food: number;
  water: number;
  security: number;
  facilities: number;
  value: number | null;
  overall: number;
  comment: string | null;
  body: string | null;
  stay_period: string | null;
  created_at: string;
  photos?: ReviewPhoto[];
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  photo_url: string | null;
  url: string | null;
  created_at: string;
}

export interface ReviewFormData {
  hostel_id: string;
  cleanliness: number;
  wifi: number;
  food: number;
  water: number;
  security: number;
  facilities: number;
  value: number;
  overall: number;
  comment: string;
  stay_period: string;
}

export type Page =
  | { name: 'home' }
  | { name: 'university'; slug: string }
  | { name: 'hostel'; hostelId: string; universitySlug: string };
