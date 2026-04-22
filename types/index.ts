export type Category = 'food' | 'spot' | 'hotel' | 'activity';

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface Trip {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  members?: TripMember[];
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: 'owner' | 'member';
  joined_at: string;
  user?: User;
}

export interface Pin {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  note: string | null;
  category: Category;
  photo_url: string | null;
  rating: number | null;
  budget: number | null;
  created_at: string;
  member?: TripMember;
}

export interface GalleryPhoto {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  size_bytes: number | null;
  created_at: string;
  member?: TripMember;
  pin?: {
    id: string;
    lat: number;
    lng: number;
    title: string;
  };
}

export interface TripStorage {
  photos_used: number;
  photos_limit: number;
  bytes_used: number;
  bytes_limit: number;
}
