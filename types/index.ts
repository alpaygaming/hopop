export type UserRole = 'customer' | 'owner' | 'admin' | null;
export type AppointmentStatus = 'active' | 'past' | 'pending' | 'confirmed' | 'cancelled';

export interface Review {
  id: string;
  user: string;
  userAvatar: string;
  shopId: string;
  shopName?: string;
  appointmentId?: string;
  comment: string;
  star: number;
  imageUrl?: string;
  date: string;
}

export interface Appointment {
  id: string;
  shopId: string;
  barberName: string;
  date: string;
  time: string;
  price: number;
  type: string;
  customerName?: string;
  status: AppointmentStatus;
}

export interface Barber {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
  type: string;
  category?: string;
  images: string[];
  imageUrl: string;
  modalWidth?: number;
  views: number;
  reviews: Review[];
  distance?: number;
  address?: string;
  description?: string;
  working_hours?: string[];
  isPromoted?: boolean;
  phone?: string;
  openingHours?: string;
  website?: string;
}

export interface RegisteredUser {
  name: string;
  username: string;
  role: 'customer' | 'owner' | 'admin';
  shopName?: string;
  avatar: string;
  balance: number;
  experiences: Review[];
  appointments: Appointment[];
}

export interface Shop {
  id: string;
  name: string;
  owner_id: string;
  latitude: number;
  longitude: number;
  category: string;
  address?: string;
  description?: string;
  image_url?: string;
  working_hours?: string[];
  promotion_status?: string;
  rating?: number;
}

export interface CreateReviewDTO {
  shop_id: string;
  user_id: string;
  appointment_id?: string | null;
  comment: string;
  star: number;
  image_url?: string;
}

export interface CreateAppointmentDTO {
  shop_id: string;
  user_id: string;
  appointment_date: string;
  price: number;
  status: AppointmentStatus;
}
