import { supabase } from '@/lib/supabase';
import { CreateAppointmentDTO, CreateReviewDTO, Shop } from '@/types';

export const ShopService = {
  getAll: () => supabase.from('shops').select('*'),
  getByCategory: (category: string) => supabase.from('shops').select('*').eq('category', category),
  getByOwner: (ownerId: string) => supabase.from('shops').select('*').eq('owner_id', ownerId).maybeSingle(),
  create: (data: Partial<Shop>) => supabase.from('shops').insert(data),
  update: (id: string, data: Partial<Shop>) => supabase.from('shops').update(data).eq('id', id),
  delete: (id: string) => supabase.from('shops').delete().eq('id', id),
};

export const AppointmentService = {
  getByUser: (userId: string) => supabase.from('appointments').select('*, shops(name, category)').eq('user_id', userId).order('created_at', { ascending: false }),
  getByShop: (shopId: string) => supabase.from('appointments').select('*, profiles(full_name)').eq('shop_id', shopId).order('created_at', { ascending: false }),
  create: (data: CreateAppointmentDTO) => supabase.from('appointments').insert(data),
  cancel: (id: string) => supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id),
  confirm: (id: string) => supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id),
};

export const ReviewService = {
  getByShop: (shopId: string) => supabase.from('reviews').select('*, profiles(full_name, avatar_url)').eq('shop_id', shopId).order('created_at', { ascending: false }),
  getByUser: (userId: string) => supabase.from('reviews').select('*, shops(name)').eq('user_id', userId).order('created_at', { ascending: false }),
  create: (data: CreateReviewDTO) => supabase.from('reviews').insert(data).select('*, profiles(full_name, avatar_url), shops(name)').single(),
  delete: (id: string) => supabase.from('reviews').delete().eq('id', id),
};

export const ProfileService = {
  getByUsername: (username: string) => supabase.from('profiles').select('id, email, role, full_name, avatar_url').eq('username', username).maybeSingle(),
  update: (id: string, data: any) => supabase.from('profiles').update(data).eq('id', id),
};
