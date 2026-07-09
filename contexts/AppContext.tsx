import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppContextType = {
  userRole: 'customer' | 'owner' | 'admin' | null;
  setUserRole: (role: 'customer' | 'owner' | 'admin' | null) => void;
  user: any;
  setUser: (user: any) => void;
  userExperiences: any[];
  setUserExperiences: (exp: any[]) => void;
  globalReviews: Record<string, any[]>;
  setGlobalReviews: (reviews: Record<string, any[]>) => void;
  appointments: any[];
  setAppointments: (apps: any[]) => void;
  ownerAppointments: any[];
  setOwnerAppointments: (apps: any[]) => void;
  ownerShopDb: any;
  setOwnerShopDb: (shop: any) => void;
  systemShops: any[];
  setSystemShops: (shops: any[]) => void;
  promoRequests: any[];
  setPromoRequests: (reqs: any[]) => void;
  deleteRequests: any[];
  setDeleteRequests: (reqs: any[]) => void;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  currentUsername: string | null;
  setCurrentUsername: (uname: string | null) => void;
  showNotification: (msg: string) => void;
  notifText: string;
  setNotifText: (txt: string) => void;
  refreshAppointments: () => void;
  refreshGlobalReviews: () => void;
  // Modals
  showTopUpModal: boolean; setShowTopUpModal: (s: boolean) => void;
  showEditProfileModal: boolean; setShowEditProfileModal: (s: boolean) => void;
  showAddExperienceModal: boolean; setShowAddExperienceModal: (s: boolean) => void;
  topUpAmount: string; setTopUpAmount: (s: string) => void;
  editProfileData: any; setEditProfileData: (d: any) => void;
  reviewTarget: any; setReviewTarget: (d: any) => void;
  reviewData: any; setReviewData: (d: any) => void;
  // Shared UI States
  selectedCategory: string | null; setSelectedCategory: (c: string | null) => void;
  dynamicBarbers: any[]; setDynamicBarbers: (d: any[]) => void;
  mapLoading: boolean; setMapLoading: (b: boolean) => void;
  sortOption: string; setSortOption: (s: string) => void;
  selectedBarber: any; setSelectedBarber: (b: any) => void;
  location: any; setLocation: (l: any) => void;
  // Owner & Admin shared states
  localImages: string[]; setLocalImages: (i: string[]) => void;
  newShopLocation: any; setNewShopLocation: (l: any) => void;
  newShopData: any; setNewShopData: (d: any) => void;
  newShopOwnerUsername: string; setNewShopOwnerUsername: (u: string) => void;
  handleRequestPromotion: () => void;
  handleDeleteRequest: (rId: string, sId: string, sName: string, comment: string) => void;
  approveDeleteRequest: (rId: string, sId: string) => void;
  rejectDeleteRequest: (rId: string) => void;
  handleApprovePromotion: (sId: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<'customer' | 'owner' | 'admin' | null>(null);
  const [user, setUser] = useState({ id: '', name: '', username: '', balance: 0, avatar: 'https://picsum.photos/id/64/200' });
  const [userExperiences, setUserExperiences] = useState<any[]>([]);
  const [globalReviews, setGlobalReviews] = useState<Record<string, any[]>>({});
  const [appointments, setAppointments] = useState<any[]>([]);
  const [ownerAppointments, setOwnerAppointments] = useState<any[]>([]);
  const [ownerShopDb, setOwnerShopDb] = useState<any>(null);
  const [systemShops, setSystemShops] = useState<any[]>([]);
  const [promoRequests, setPromoRequests] = useState<any[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [notifText, setNotifText] = useState("");

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [editProfileData, setEditProfileData] = useState({ name: '', username: '', avatar: '' });
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ star: 5, comment: '', image: '' });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dynamicBarbers, setDynamicBarbers] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [sortOption, setSortOption] = useState('rating');
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [newShopLocation, setNewShopLocation] = useState<any>(null);
  const [newShopData, setNewShopData] = useState({ name: '', description: '', address: '' });
  const [newShopOwnerUsername, setNewShopOwnerUsername] = useState('');

  const showNotification = (msg: string) => {
    setNotifText(msg);
    setTimeout(() => setNotifText(""), 3000);
  };

  const refreshGlobalReviews = async () => {
    try {
      const { data: shopsData } = await supabase.from('shops').select('*');
      if (shopsData) setSystemShops(shopsData);

      const { data, error } = await supabase.from('reviews').select('*, profiles(full_name, avatar_url), shops(name)');
      if (!error && data) {
        const newGlobalReviews: Record<string, any[]> = {};
        data.forEach((row: any) => {
          const rev = {
            id: row.id,
            user: row.profiles?.full_name || 'Anonim',
            userAvatar: row.profiles?.avatar_url || 'https://i.pravatar.cc/150',
            shopId: row.shop_id,
            shopName: row.shops?.name || 'Dükkan',
            appointmentId: row.appointment_id,
            comment: row.comment || '',
            star: row.star,
            imageUrl: row.image_url,
            date: new Date(row.created_at).toLocaleDateString()
          };
          if(!newGlobalReviews[row.shop_id]) newGlobalReviews[row.shop_id] = [];
          newGlobalReviews[row.shop_id].push(rev);
        });
        setGlobalReviews(newGlobalReviews);
      }
      
      const reqData = await AsyncStorage.getItem('hopop_delete_requests');
      if (reqData) setDeleteRequests(JSON.parse(reqData));
    } catch (e) {}
  };

  const refreshAppointments = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('appointments').select('*, shops(name)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error && data) {
        setAppointments(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    refreshGlobalReviews();
    refreshAppointments();
  }, [user?.id]);

  // Realtime Subscriptions
  useEffect(() => {
    // Shops Subscription
    const shopSub = supabase
      .channel('public:shops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, payload => {
        if (payload.eventType === 'INSERT') {
          setSystemShops((prev: any) => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setSystemShops((prev: any) => prev.filter((s: any) => s.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setSystemShops((prev: any) => prev.map((s: any) => s.id === payload.new.id ? payload.new : s));
        }
      })
      .subscribe();

    // Appointments Subscription
    const appointmentSub = supabase
      .channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, payload => {
        if (payload.eventType === 'INSERT') {
          // If the appointment is for the user, add it to their appointments
          if (payload.new.user_id === user?.id) {
            setAppointments((prev: any) => [payload.new, ...prev]);
          }
          // If the appointment is for the owner's shop, add it to ownerAppointments
          if (ownerShopDb && payload.new.shop_id === ownerShopDb.id) {
            setOwnerAppointments((prev: any) => [payload.new, ...prev]);
          }
        }
      })
      .subscribe();

    // Reviews Subscription
    const reviewSub = supabase
      .channel('public:reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, payload => {
        if (payload.eventType === 'INSERT') {
          const shopId = payload.new.shop_id;
          setGlobalReviews((prev: any) => {
            const currentShopReviews = prev[shopId] || [];
            return { ...prev, [shopId]: [payload.new, ...currentShopReviews] };
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(shopSub);
      supabase.removeChannel(appointmentSub);
      supabase.removeChannel(reviewSub);
    };
  }, [user?.id, ownerShopDb?.id]);

  const handleRequestPromotion = async () => {};
  const handleDeleteRequest = async (rId: string, sId: string, sName: string, comment: string) => {};
  const approveDeleteRequest = async (rId: string, sId: string) => {};
  const rejectDeleteRequest = async (rId: string) => {};
  const handleApprovePromotion = async (sId: string) => {};

  return (
    <AppContext.Provider value={{
      userRole, setUserRole, user, setUser, userExperiences, setUserExperiences,
      globalReviews, setGlobalReviews, appointments, setAppointments,
      ownerAppointments, setOwnerAppointments, ownerShopDb, setOwnerShopDb,
      systemShops, setSystemShops, promoRequests, setPromoRequests,
      deleteRequests, setDeleteRequests, authLoading, setAuthLoading,
      currentUsername, setCurrentUsername, showNotification, notifText, setNotifText,
      refreshAppointments, refreshGlobalReviews,
      showTopUpModal, setShowTopUpModal, showEditProfileModal, setShowEditProfileModal,
      showAddExperienceModal, setShowAddExperienceModal, topUpAmount, setTopUpAmount,
      editProfileData, setEditProfileData, reviewTarget, setReviewTarget, reviewData, setReviewData,
      selectedCategory, setSelectedCategory, dynamicBarbers, setDynamicBarbers, mapLoading, setMapLoading,
      sortOption, setSortOption, selectedBarber, setSelectedBarber, location, setLocation,
      localImages, setLocalImages, newShopLocation, setNewShopLocation, newShopData, setNewShopData,
      newShopOwnerUsername, setNewShopOwnerUsername, handleRequestPromotion, handleDeleteRequest,
      approveDeleteRequest, rejectDeleteRequest, handleApprovePromotion
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
