import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Dimensions } from 'react-native';
import AppMap from '../../components/AppMap';
import AdminMap from '../../components/AdminMap';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { RegisterScreen } from '@/components/screens/RegisterScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { AppointmentsScreen } from '@/components/screens/AppointmentsScreen';
import { ShopsScreen } from '@/components/screens/ShopsScreen';
import { ExploreScreen } from '@/components/screens/ExploreScreen';
import { OwnerPanelScreen } from '@/components/screens/OwnerPanelScreen';
import { AdminPanelScreen } from '@/components/screens/AdminPanelScreen';
import { BarberDetailModal } from '@/components/modals/BarberDetailModal';
import { TopUpModal } from '@/components/modals/TopUpModal';
import { ManualAddModal } from '@/components/modals/ManualAddModal';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { AddExperienceModal } from '@/components/modals/AddExperienceModal';
import { UserRole } from '@/types';

// --- OVERPASS API (OpenStreetMap) ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.floor(R * c);
};

const getShopImages = (image_url: string | null | undefined): string[] => {
  if (!image_url) return [];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [image_url];
};

const getOverpassQuery = (lat: number, lon: number, category: string): string => {
  const r = 4000;
  const area = `(around:${r},${lat},${lon})`;

  // Her kategori için basit ve etkili sorgular
  const queries: Record<string, string> = {
    berber: `node["shop"="barber"]${area};node["shop"="hairdresser"]${area};way["shop"="barber"]${area};way["shop"="hairdresser"]${area};`,
    kuaför: `node["shop"="hairdresser"]${area};node["shop"="beauty"]${area};way["shop"="hairdresser"]${area};way["shop"="beauty"]${area};`,
    tırnak: `node["shop"="nails"]${area};node["shop"="beauty"]${area};node["beauty"="nails"]${area};way["shop"="nails"]${area};way["shop"="beauty"]${area};`,
    güzellik: `node["shop"="beauty"]${area};node["leisure"="spa"]${area};node["healthcare"="skin_care"]${area};way["shop"="beauty"]${area};way["leisure"="spa"]${area};`,
    all: `node["shop"="barber"]${area};node["shop"="hairdresser"]${area};node["shop"="beauty"]${area};node["shop"="nails"]${area};node["leisure"="spa"]${area};way["shop"="barber"]${area};way["shop"="hairdresser"]${area};way["shop"="beauty"]${area};way["shop"="nails"]${area};way["leisure"="spa"]${area};`,
  };

  const body = queries[category] || queries['all'];
  return `[out:json][timeout:25];(${body});out center body;`;
};

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface Review {
  id: string; user: string; userAvatar: string; shopId: string; shopName?: string; appointmentId?: string;
  comment: string; star: number; imageUrl?: string; date: string;
}

const fetchNearbyPlaces = async (
  lat: number, lon: number, category: string, globalReviews: Record<string, Review[]>
): Promise<Barber[]> => {
  const query = getOverpassQuery(lat, lon, category);

  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(`Trying ${server} for category: ${category}`);
      const url = `${server}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`Server ${server} returned ${response.status}, trying next...`);
        continue;
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log('JSON parse error, trying next server...');
        continue;
      }

      if (!data.elements || data.elements.length === 0) {
        console.log('No elements found from', server);
        return [];
      }

      console.log(`Found ${data.elements.length} places from ${server}`);

      return data.elements
        .filter((el: any) => (el.lat || el.center?.lat))
        .map((el: any) => {
          const elLat = el.lat || el.center?.lat;
          const elLon = el.lon || el.center?.lon;
          const tags = el.tags || {};
          const name = tags.name || tags['name:tr'] || 'İsimsiz Dükkan';
          const osmType = detectCategory(tags);
          const distance = calculateDistance(lat, lon, elLat, elLon);
          
          const shopId = `osm-${el.id}`;
          const shopReviews = globalReviews[shopId] || [];
          const calculatedRating = shopReviews.length > 0 
            ? (shopReviews.reduce((sum, r) => sum + r.star, 0) / shopReviews.length) 
            : 0;

          return {
            id: shopId,
            name,
            latitude: elLat,
            longitude: elLon,
            rating: calculatedRating,
            type: osmType,
            imageUrl: tags.image || `https://picsum.photos/seed/${el.id}/400/300`,
            isPromoted: false,
            views: Math.floor(Math.random() * 500),
            reviews: shopReviews,
            address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ') || tags['addr:full'] || '',
            phone: tags.phone || tags['contact:phone'] || '',
            openingHours: tags.opening_hours || '',
            website: tags.website || tags['contact:website'] || '',
            distance,
            description: tags.description || '',
          } as Barber;
        });
    } catch (error: any) {
      console.log(`Error from ${server}:`, error.message);
      continue;
    }
  }

  Alert.alert('Bağlantı Hatası', 'Overpass API sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  return [];
};

const detectCategory = (tags: any): 'berber' | 'tırnak' | 'güzellik' | 'kuaför' => {
  if (tags.shop === 'barber') return 'berber';
  if (tags.shop === 'nails' || tags.shop === 'nail_salon') return 'tırnak';
  if (tags.shop === 'beauty' || tags.leisure === 'spa') return 'güzellik';
  if (tags.shop === 'hairdresser') return 'kuaför';
  return 'berber';
};

// --- TİPLER ---
interface Appointment {
  id: string;
  shopId: string;
  barberName: string;
  date: string;
  time: string;
  price: number;
  type: string;
  customerName?: string;
  status: 'active' | 'past' | 'pending' | 'confirmed' | 'cancelled';
}

interface Barber {
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

interface RegisteredUser {
  name: string; username: string; password: string;
  role: 'customer' | 'owner'; shopName?: string; avatar: string;
  balance: number;
  experiences: Review[];
  appointments: Appointment[];
}

const CATEGORIES_DATA = [
  { id: 'berber', name: 'Berber', icon: 'cut' },
  { id: 'kuaför', name: 'Kuaför', icon: 'female' },
  { id: 'tırnak', name: 'Nail Art', icon: 'hand-sparkles' },
  { id: 'güzellik', name: 'Güzellik', icon: 'spa' },
];

export default function App() {
  const [userRole, setUserRole] = useState<'customer' | 'owner' | 'admin' | null>(null);
  const [authState, setAuthState] = useState<'login' | 'register' | 'loggedIn'>('login');
  const [activeTab, setActiveTab] = useState<'map' | 'shops' | 'appointments' | 'profile' | 'owner_panel' | 'admin_panel'>('map');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (tab: any) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Müşteri State
  const [user, setUser] = useState({ id: '', name: '', username: '', balance: 0, avatar: 'https://picsum.photos/id/64/200' });
  const [userExperiences, setUserExperiences] = useState<Review[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  
  // Reviews global store (acting as database)
  const [globalReviews, setGlobalReviews] = useState<Record<string, Review[]>>({});

  // İşletme State
  const [ownerShop, setOwnerShop] = useState({ name: 'Elite Master Salon', balance: 250, views: 1540, isPromoted: false, promoTime: 43200 });
  const [ownerShopDb, setOwnerShopDb] = useState<any>(null); // Gerçek Supabase Dükkanı (İşletmeci için)
  
  // Admin (Sistem) State
  const [systemShops, setSystemShops] = useState<any[]>([]);
  const [promoRequests, setPromoRequests] = useState<any[]>([]);
  const [newShopData, setNewShopData] = useState({ name: '', description: '', address: '' });
  const [newShopLocation, setNewShopLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [newShopCategory, setNewShopCategory] = useState('berber');
  const [newShopOwnerUsername, setNewShopOwnerUsername] = useState('');
  
  const [ownerAppointments, setOwnerAppointments] = useState<Appointment[]>([
    { id: 'ex-1', shopId: 'osm-1', barberName: 'Elite Master Salon', date: 'Bugün', time: '15:30', price: 350, type: 'berber', customerName: 'Emre Yıldız', status: 'active' }
  ]);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("Bugün");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dynamicBarbers, setDynamicBarbers] = useState<Barber[]>([]);
  const [sortOption, setSortOption] = useState<'nearest' | 'farthest' | 'highest_rating' | 'lowest_rating'>('nearest');
  const [dbLoaded, setDbLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [showAddExpModal, setShowAddExpModal] = useState(false); // Yeni manuel deneyim modalı
  const [manualCustName, setManualCustName] = useState('');
  const [manualTime, setManualTime] = useState('');

  // Profil ve Deneyim Ekleme
  const [editProfileData, setEditProfileData] = useState(user);
  const [newExpShopName, setNewExpShopName] = useState('');
  const [newExpShopId, setNewExpShopId] = useState('');
  const [newExpAppId, setNewExpAppId] = useState('');
  const [newExpComment, setNewExpComment] = useState('');
  const [newExpImage, setNewExpImage] = useState('');
  const [newExpStar, setNewExpStar] = useState(5);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);
  const [reviewData, setReviewData] = useState({ star: 5, comment: '', imageUrl: '' });
  const [notifText, setNotifText] = useState("");
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // DB States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [deleteRequests, setDeleteRequests] = useState<{reviewId: string, shopId: string, shopName: string, comment: string}[]>([]);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [regRole, setRegRole] = useState<'customer' | 'owner'>('customer');
  const [regShopName, setRegShopName] = useState('');

  const loadDbFromStorage = useCallback(async () => {
    try {
      const fetchGlobalReviewsFromDb = async () => {
        try {
          const { data, error } = await supabase.from('reviews').select('*, profiles(full_name, avatar_url), shops(name)');
          if (!error && data) {
            const newGlobalReviews: Record<string, Review[]> = {};
            data.forEach((row: any) => {
              const rev: Review = {
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
        } catch(e) {}
        
        try {
          const reqData = await AsyncStorage.getItem('hopop_delete_requests');
          if (reqData) setDeleteRequests(JSON.parse(reqData));
        } catch (e) {}
      };
      await fetchGlobalReviewsFromDb();

    } catch (e) {
      console.log('Load error:', e);
      setRegisteredUsers(DEFAULT_USERS);
    }
  }, []);

  useEffect(() => {
    loadDbFromStorage();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem('hopop_session');
        if (savedSession) {
          const { username, password } = JSON.parse(savedSession);
          setLoginUsername(username);
          setLoginPassword(password);
          setRememberMe(true);
          await handleLogin(username, password);
        }
      } catch (e) {}
      setAuthLoading(false);
    };
    checkSession();
  }, []);

  const updateUserInDb = useCallback(async (username: string, updates: Partial<RegisteredUser>) => {
    setRegisteredUsers(prev => {
      const updated = prev.map(u => u.username.toLowerCase() === username.toLowerCase() ? { ...u, ...updates } : u);
      saveUsersToStorage(updated);
      return updated;
    });

    if (updates.name || updates.avatar) {
       const profileUpdates: any = {};
       if (updates.name) profileUpdates.full_name = updates.name;
       if (updates.avatar) profileUpdates.avatar_url = updates.avatar;
       const { data: { user: currentUser } } = await supabase.auth.getUser();
       if (currentUser) {
          await supabase.from('profiles').update(profileUpdates).eq('id', currentUser.id);
       }
    }
  }, [saveUsersToStorage]);

  const pickImage = async (setter: (uri: string) => void, aspect: [number, number] = [1, 1]) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const imageUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setter(imageUri);
    }
  };

  useEffect(() => {
    let interval: any;
    if (ownerShop.isPromoted && ownerShop.promoTime > 0) {
      interval = setInterval(() => {
        setOwnerShop(prev => ({ ...prev, promoTime: prev.promoTime - 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [ownerShop.isPromoted]);

  useEffect(() => {
    (async () => {
      await loadDbFromStorage();
      setDbLoaded(true);

      try {
        const permPromise = Location.requestForegroundPermissionsAsync();
        const permTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Perm timeout')), 3000));
        let statusObj = await Promise.race([permPromise, permTimeout]) as any;
        
        if (!statusObj || statusObj.status !== 'granted') {
          setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
        } else {
          const locationPromise = Location.getCurrentPositionAsync({ accuracy: 3 }); // Accuracy.Balanced = 3
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 3000));
          
          let curr = await Promise.race([locationPromise, timeoutPromise]) as any;
          setLocation(curr);
        }
      } catch (e) {
        setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCategory || !location) return;
    const loadPlaces = async () => {
      setMapLoading(true);
      
      let query = supabase.from('shops').select('*');
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      
      if (error) {
        showNotification('Harita verisi çekilemedi.');
      } else {
        const places = (data || []).map((shop: any) => ({
          id: shop.id,
          name: shop.name,
          latitude: shop.latitude,
          longitude: shop.longitude,
          rating: shop.rating || 0,
          type: shop.category,
          images: shop.image_url ? getShopImages(shop.image_url) : [`https://picsum.photos/seed/${shop.id}/400/300`],
          imageUrl: shop.image_url ? getShopImages(shop.image_url)[0] : `https://picsum.photos/seed/${shop.id}/400/300`,
          views: 0,
          reviews: globalReviews[shop.id] || [],
          address: shop.address || '',
          description: shop.description || '',
          working_hours: shop.working_hours,
          distance: calculateDistance(location.coords.latitude, location.coords.longitude, shop.latitude, shop.longitude)
        }));
        
        setDynamicBarbers(places);
        if (places.length === 0) {
          showNotification('Bu kategoride yakınında dükkan bulunamadı 😕');
        } else {
          showNotification(`${places.length} dükkan bulundu! 📍`);
        }
      }
      setMapLoading(false);
    };
    loadPlaces();
  }, [selectedCategory, location]);

  const showNotification = (msg: string) => {
    setNotifText(msg);
    Animated.timing(slideAnim, { toValue: 50, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => { Animated.timing(slideAnim, { toValue: -100, duration: 500, useNativeDriver: true }).start(); }, 3000);
  };

  const handleConfirmAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id);
    if (error) { Alert.alert("Hata", error.message); return; }
    
    setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
    Alert.alert("Hopop", "Dükkana gideceğinizi bildirdik! ✅ İşletme ekranına düştü.");
  };

  const handlePayment = async () => {
    if (!selectedTime) { Alert.alert("Hata", "Lütfen saat seçiniz."); return; }
    if (user.balance < 350) { Alert.alert("Hata", "Yetersiz bakiye."); return; }
    
    const appDate = new Date();
    const [hours, mins] = selectedTime.split(':');
    appDate.setHours(parseInt(hours), parseInt(mins), 0);

    const { data: newApp, error } = await supabase.from('appointments').insert({
      shop_id: selectedBarber!.id,
      user_id: user.id,
      appointment_date: appDate.toISOString(),
      status: 'pending',
      price: 350
    }).select('*, shops(name, category)').single();

    if (error) {
      Alert.alert("Hata", "Randevu oluşturulamadı: " + error.message);
      return;
    }
    
    const newBalance = user.balance - 350;
    setUser(prev => ({ ...prev, balance: newBalance }));
    
    const localApp = { 
      id: newApp.id, 
      shopId: selectedBarber!.id, 
      barberName: selectedBarber!.name, 
      date: 'Bugün', 
      time: selectedTime, 
      price: 350, 
      type: selectedBarber!.category || 'berber', 
      status: 'pending' as const 
    };
    
    setAppointments([localApp, ...appointments]);
    if(currentUsername) updateUserInDb(currentUsername, { balance: newBalance });

    setSelectedBarber(null);
    setSelectedTime(null);
    setActiveTab('appointments');
    showNotification("Ödeme Alındı! Randevularım kısmından onaylayın ✅");
  };

  const handleLogin = async (overrideUser?: string, overridePass?: string) => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const u = overrideUser || loginUsername;
      const p = overridePass || loginPassword;

      if (!u.trim() || !p.trim()) { setAuthError("Lütfen tüm alanları doldurun."); return; }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, avatar_url')
        .eq('username', u)
        .maybeSingle();

      if (profileError) {
        setAuthError("SQL kodu çalıştırılmamış olabilir: " + profileError.message);
        return;
      }

      if (!profile || !profile.email) {
        setAuthError("Böyle bir kullanıcı bulunamadı."); 
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: p
      });

      if (error) { 
        setAuthError("Şifreniz hatalı veya E-posta onayı kapatılmamış: " + error.message); 
        return; 
      }

    let frontendRole = profile.role; 
    
    if (profile.role === 'admin') {
      const { data: shops } = await supabase.from('shops').select('id, name, promotion_status, latitude, longitude');
      setSystemShops(shops || []);
      setPromoRequests((shops || []).filter(s => s.promotion_status === 'pending'));
    } else {
      const { data: shop } = await supabase.from('shops').select('*').eq('owner_id', profile.id).maybeSingle();
      if (shop) {
         frontendRole = 'owner';
         setOwnerShopDb(shop);
         setLocalImages(getShopImages(shop.image_url));
         setOwnerShop(prev => ({ ...prev, name: shop.name }));
      }
    }

    const existingUserStr = await AsyncStorage.getItem('last_logged_user');
    let found;
    if (existingUserStr) {
      found = JSON.parse(existingUserStr);
    }
    
    if (!found || found.username !== u) {
      found = {
        name: profile.full_name || u, 
        username: u, 
        role: frontendRole, 
        avatar: profile.avatar_url || 'https://picsum.photos/id/64/200', 
        balance: 500, 
        experiences: [], 
        appointments: [],
        shopName: undefined
      };
      await AsyncStorage.setItem('last_logged_user', JSON.stringify(found));
    }
    
    let fetchedApps: any[] = [];
    if (frontendRole === 'customer') {
      const { data: cApps } = await supabase.from('appointments').select('*, shops(name, category)').eq('user_id', profile.id).order('created_at', { ascending: false });
      fetchedApps = (cApps || []).map(a => ({
         id: a.id, shopId: a.shop_id, barberName: a.shops?.name,
         date: new Date(a.appointment_date).toLocaleDateString(),
         time: new Date(a.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         price: a.price, type: a.shops?.category, status: a.status
      }));
    } else if (frontendRole === 'owner' && ownerShopDb) {
      const { data: oApps } = await supabase.from('appointments').select('*, profiles(full_name)').eq('shop_id', ownerShopDb.id).order('created_at', { ascending: false });
      const mappedDb = (oApps || []).map((a: any) => ({
         id: a.id, shopId: a.shop_id, barberName: ownerShopDb.name,
         customerName: a.profiles?.full_name || 'Müşteri',
         date: new Date(a.appointment_date).toLocaleDateString(),
         time: new Date(a.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         price: a.price, type: ownerShopDb.category, status: a.status
      }));
      
      let manualApps = [];
      try {
        const mData = await AsyncStorage.getItem('hopop_manual_apps_' + ownerShopDb.id);
        if (mData) manualApps = JSON.parse(mData);
      } catch(e) {}
      
      setOwnerAppointments([...mappedDb, ...manualApps]);
    }
    
    const { data: userRevs } = await supabase.from('reviews').select('*, shops(name)').eq('user_id', profile.id).order('created_at', { ascending: false });
    const mappedRevs = (userRevs || []).map((row: any) => ({
      id: row.id,
      user: profile.full_name,
      userAvatar: profile.avatar_url,
      shopId: row.shop_id,
      shopName: row.shops?.name,
      appointmentId: row.appointment_id,
      comment: row.comment,
      star: row.star,
      imageUrl: row.image_url,
      date: new Date(row.created_at).toLocaleDateString()
    }));

    setCurrentUsername(found.username);
    setUserRole(frontendRole as any);
    setUser({ id: profile.id, name: found.name, username: found.username, balance: found.balance, avatar: found.avatar });
    setUserExperiences(mappedRevs);
    setAppointments(fetchedApps);
    setEditProfileData({ id: profile.id, name: found.name, username: found.username, balance: found.balance, avatar: found.avatar });
    
      if (rememberMe || (overrideUser && overridePass)) {
        await AsyncStorage.setItem('hopop_session', JSON.stringify({ username: u, password: p }));
      } else {
        await AsyncStorage.removeItem('hopop_session');
      }

      setAuthState('loggedIn');
      
      if (frontendRole === 'admin') setActiveTab('admin_panel');
      else if (frontendRole === 'owner') setActiveTab('owner_panel');
      else setActiveTab('map');
      
      setSelectedCategory(null);
      if (!rememberMe && !overrideUser) {
        setLoginUsername('');
        setLoginPassword('');
      }
      showNotification(`Hoş geldin, ${found.name}! 👋`);
    } catch (err: any) {
      setAuthError(err.message || "Bilinmeyen bir hata oluştu.");
    }
  };

  const handleRegister = async (regRoleParam: UserRole, regNameParam: string, regUsernameParam: string, regEmailParam: string, regPasswordParam: string, regShopNameParam: string) => {
    try {
      setAuthError('');
      if (!regNameParam.trim() || !regUsernameParam.trim() || !regEmailParam.trim() || !regPasswordParam.trim()) { setAuthError("Lütfen tüm alanları doldurun."); return; }
      if (regRoleParam === 'owner' && !regShopNameParam.trim()) { setAuthError("İşletme adı zorunludur."); return; }
      if (regPasswordParam.length < 6) { setAuthError("Şifre en az 6 karakter olmalıdır."); return; }
      
      const { data: existingProfile, error: existError } = await supabase.from('profiles').select('id').eq('username', regUsernameParam).maybeSingle();
      if (existingProfile) { setAuthError("Bu kullanıcı adı zaten alınmış."); return; }

      const { data, error } = await supabase.auth.signUp({
        email: regEmailParam,
        password: regPasswordParam,
      });

      if (error) {
        setAuthError("Kayıt Hatası: " + error.message);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').update({ 
          full_name: regNameParam,
          username: regUsernameParam,
          email: regEmailParam,
          role: regRoleParam
        }).eq('id', data.user.id);
      }

      setLoginUsername(regUsernameParam);
      setLoginPassword(regPasswordParam);
      setAuthState('login');
      alert("Kayıt başarılı! Giriş yapabilirsiniz.");
    } catch (err: any) {
      setAuthError(err.message || "Bilinmeyen bir hata oluştu.");
    }
  };

  const handleCreateShop = async () => {
    if (!newShopLocation) { alert("Lütfen haritadan konum seçin."); return; }
    if (!newShopData.name.trim() || !newShopOwnerUsername.trim()) { alert("Lütfen dükkan adını ve sahibinin kullanıcı adını doldurun."); return; }
    
    const { data: ownerProfile, error: profileErr } = await supabase.from('profiles').select('id').ilike('username', newShopOwnerUsername).maybeSingle();
    
    if (profileErr || !ownerProfile) {
      alert("Bu kullanıcı adına sahip bir hesap bulunamadı!");
      return;
    }

    const shopToInsert = {
      owner_id: ownerProfile.id,
      name: newShopData.name,
      description: newShopData.description,
      address: newShopData.address,
      latitude: newShopLocation.latitude,
      longitude: newShopLocation.longitude,
      category: newShopCategory,
      promotion_status: 'none'
    };
    
    const { data, error } = await supabase.from('shops').insert(shopToInsert).select('*').single();
    if (error) { alert("Hata: " + error.message); return; }
    
    setSystemShops([...systemShops, data]);
    setNewShopData({ name: '', description: '', address: '' });
    setNewShopOwnerUsername('');
    showNotification("Dükkan başarıyla oluşturuldu ve işletmeciye atandı! 🎉");
  };

  const handleRequestPromotion = async () => {
    if (user.balance < 100) return Alert.alert("Hata", "Yetersiz bakiye.");
    if (!ownerShopDb) return;
    
    const { error } = await supabase.from('shops').update({ promotion_status: 'pending' }).eq('id', ownerShopDb.id);
    if (error) { alert("Hata: " + error.message); return; }
    
    const newBalance = user.balance - 100;
    setUser(prev => ({ ...prev, balance: newBalance }));
    if(currentUsername) updateUserInDb(currentUsername, { balance: newBalance });
    
    showNotification("Öne Çıkarma isteğiniz Admin'e gönderildi!");
    setOwnerShopDb({ ...ownerShopDb, promotion_status: 'pending' });
  };
  
  const handleApprovePromotion = async (shopId: string) => {
    const { error } = await supabase.from('shops').update({ promotion_status: 'approved' }).eq('id', shopId);
    if (error) { alert("Hata: " + error.message); return; }
    
    setPromoRequests(promoRequests.filter(s => s.id !== shopId));
    showNotification("Dükkan öne çıkarıldı! ✅");
  };
  
  const handleDeleteShop = async (shopId: string) => {
    const { error } = await supabase.from('shops').delete().eq('id', shopId);
    if (error) { alert("Hata: " + error.message); return; }
    
    setSystemShops(systemShops.filter(s => s.id !== shopId));
    setPromoRequests(promoRequests.filter(s => s.id !== shopId));
    showNotification("Dükkan silindi!");
  };

  const updateAverageRating = async (shopId: string, reviewsForShop: Review[]) => {
    if (reviewsForShop.length === 0 || shopId.includes('osm-')) return;
    const avg = reviewsForShop.reduce((sum, r) => sum + r.star, 0) / reviewsForShop.length;
    
    setDynamicBarbers(prev => prev.map(b => b.id === shopId ? { ...b, rating: avg } : b));
    setSystemShops(prev => prev.map(s => s.id === shopId ? { ...s, rating: avg } : s));
    if (ownerShopDb?.id === shopId) setOwnerShopDb({ ...ownerShopDb, rating: avg });
    if (selectedBarber?.id === shopId) setSelectedBarber({ ...selectedBarber, rating: avg });
    
    await supabase.from('shops').update({ rating: avg }).eq('id', shopId);
  };

  const handleDeleteRequest = async (reviewId: string, shopId: string, shopName: string, comment: string) => {
    const req = { reviewId, shopId, shopName, comment };
    const newReqs = [...deleteRequests, req];
    setDeleteRequests(newReqs);
    try { await AsyncStorage.setItem('hopop_delete_requests', JSON.stringify(newReqs)); } catch(e){}
    showNotification("Silme isteği yöneticiye iletildi.");
  };

  const approveDeleteRequest = async (reviewId: string, shopId: string) => {
    const newReqs = deleteRequests.filter(r => r.reviewId !== reviewId);
    setDeleteRequests(newReqs);
    try { await AsyncStorage.setItem('hopop_delete_requests', JSON.stringify(newReqs)); } catch(e){}
    
    const shopReviews = (globalReviews[shopId] || []).filter(r => r.id !== reviewId);
    const newGlobalReviews = {...globalReviews, [shopId]: shopReviews};
    setGlobalReviews(newGlobalReviews);
    updateAverageRating(shopId, shopReviews);
    await supabase.from('reviews').delete().eq('id', reviewId);
    showNotification("Yorum kalıcı olarak silindi.");
  };

  const rejectDeleteRequest = async (reviewId: string) => {
    const newReqs = deleteRequests.filter(r => r.reviewId !== reviewId);
    setDeleteRequests(newReqs);
    try { await AsyncStorage.setItem('hopop_delete_requests', JSON.stringify(newReqs)); } catch(e){}
    showNotification("Silme isteği reddedildi.");
  };

  const deleteReviewDirectly = async (reviewId: string, shopId: string) => {
    const shopReviews = (globalReviews[shopId] || []).filter(r => r.id !== reviewId);
    const newGlobalReviews = {...globalReviews, [shopId]: shopReviews};
    setGlobalReviews(newGlobalReviews);
    updateAverageRating(shopId, shopReviews);
    await supabase.from('reviews').delete().eq('id', reviewId);
    showNotification("Yorum silindi.");
  };

  if (loading || !location || !dbLoaded || authLoading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#000" /></View>;

  if (authState === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onNavigateRegister={() => setAuthState('register')}
        authError={authError}
      />
    );
  }

  if (authState === 'register') {
    return (
      <RegisterScreen
        onRegister={handleRegister}
        onNavigateLogin={() => setAuthState('login')}
        authError={authError}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.notificationBar, { transform: [{ translateY: slideAnim }] }]}><Text style={styles.notificationText}>{notifText}</Text></Animated.View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* --- MÜŞTERİ PANELİ --- */}
      {userRole === 'customer' && (
        <View style={{ flex: 1 }}>
          {activeTab === 'map' && (
            <ExploreScreen
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              location={location}
              dynamicBarbers={dynamicBarbers}
              setSelectedBarber={setSelectedBarber}
              mapLoading={mapLoading}
              setDynamicBarbers={setDynamicBarbers}
            />
          )}

          {activeTab === 'shops' && (
            <ShopsScreen
              dynamicBarbers={dynamicBarbers}
              sortOption={sortOption}
              setSortOption={setSortOption}
              setSelectedCategory={setSelectedCategory}
              setSelectedBarber={setSelectedBarber}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsScreen
              appointments={appointments}
              onRefresh={() => showNotification("Randevular güncel!")}
              onConfirm={handleConfirmAppointment}
              onCancel={async (item) => {
                const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', item.id);
                if (error) { Alert.alert("Hata", error.message); return; }
                
                const newApps = appointments.filter(a => a.id !== item.id);
                setAppointments(newApps); 
                setUser({ ...user, balance: user.balance + 350 }); 
                if(currentUsername) updateUserInDb(currentUsername, { balance: user.balance + 350 });
                showNotification("Ücret iade edildi."); 
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              appointments={appointments}
              userExperiences={userExperiences}
              onRefreshProfile={() => showNotification("Profil bilgileri güncel!")}
              onEditProfile={() => { setEditProfileData(user); setShowEditProfileModal(true); }}
              onTopUp={() => setShowTopUpModal(true)}
              onAddReview={(app) => { setReviewTarget(app); setReviewData({ star: 5, comment: '', imageUrl: '' }); setAuthError(''); setShowAddExperienceModal(true); }}
              onLogout={() => { 
                if (currentUsername) { updateUserInDb(currentUsername, { balance: user.balance, experiences: userExperiences, appointments }); }
                setCurrentUsername(null);
                setAuthState('login'); 
              }}
            />
          )}
        </View>
      )}

      {/* --- İŞLETME PANELİ (FULL) --- */}
      {activeTab === 'owner_panel' && (
        <View style={styles.tabPadding}>
          <OwnerPanelScreen
            ownerShopDb={ownerShopDb}
            ownerShop={ownerShop}
            user={user}
            localImages={localImages}
            setLocalImages={setLocalImages}
            pickImage={pickImage}
            setOwnerShopDb={setOwnerShopDb}
            showNotification={showNotification}
            handleRequestPromotion={handleRequestPromotion}
            ownerAppointments={ownerAppointments}
            setOwnerAppointments={setOwnerAppointments}
            setShowManualAddModal={setShowManualAddModal}
            globalReviews={globalReviews}
            deleteRequests={deleteRequests}
            handleDeleteRequest={handleDeleteRequest}
            onLogout={() => { setCurrentUsername(null); setAuthState('login'); }}
          />
        </View>
      )}

      {/* --- ADMİN PANELİ (SİSTEM) --- */}
      {activeTab === 'admin_panel' && (
        <AdminPanelScreen
          promoRequests={promoRequests}
          handleApprovePromotion={handleApprovePromotion}
          deleteRequests={deleteRequests}
          approveDeleteRequest={approveDeleteRequest}
          rejectDeleteRequest={rejectDeleteRequest}
          newShopLocation={newShopLocation}
          setNewShopLocation={setNewShopLocation}
          systemShops={systemShops}
          newShopOwnerUsername={newShopOwnerUsername}
          setNewShopOwnerUsername={setNewShopOwnerUsername}
          newShopData={newShopData}
          setNewShopData={setNewShopData}
          newShopCategory={newShopCategory}
          setNewShopCategory={setNewShopCategory}
          handleCreateShop={handleCreateShop}
          handleDeleteShop={handleDeleteShop}
          setReviewTarget={setReviewTarget}
          setReviewData={setReviewData}
          setShowAddExperienceModal={setShowAddExperienceModal}
          globalReviews={globalReviews}
          deleteReviewDirectly={deleteReviewDirectly}
          onLogout={() => { setCurrentUsername(null); setAuthState('login'); }}
        />
      )}
      </Animated.View>

      {/* MODALLAR */}
      <BarberDetailModal
        selectedBarber={selectedBarber}
        setSelectedBarber={setSelectedBarber}
        modalImageIndex={modalImageIndex}
        setModalImageIndex={setModalImageIndex}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        userRole={userRole}
        handlePayment={handlePayment}
        showNotification={showNotification}
        globalReviews={globalReviews}
      />

      <TopUpModal
        showTopUpModal={showTopUpModal}
        setShowTopUpModal={setShowTopUpModal}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        user={user}
        setUser={setUser}
        currentUsername={currentUsername}
        updateUserInDb={updateUserInDb}
        showNotification={showNotification}
      />

      <ManualAddModal
        showManualAddModal={showManualAddModal}
        setShowManualAddModal={setShowManualAddModal}
        manualCustName={manualCustName}
        setManualCustName={setManualCustName}
        manualTime={manualTime}
        setManualTime={setManualTime}
        ownerShopDb={ownerShopDb}
        ownerAppointments={ownerAppointments}
        setOwnerAppointments={setOwnerAppointments}
        showNotification={showNotification}
      />

      <EditProfileModal
        showEditProfileModal={showEditProfileModal}
        setShowEditProfileModal={setShowEditProfileModal}
        editProfileData={editProfileData}
        setEditProfileData={setEditProfileData}
        pickImage={pickImage}
        user={user}
        setUser={setUser}
        currentUsername={currentUsername}
        updateUserInDb={updateUserInDb}
        showNotification={showNotification}
      />

      <AddExperienceModal
        showAddExperienceModal={showAddExperienceModal}
        setShowAddExperienceModal={setShowAddExperienceModal}
        reviewTarget={reviewTarget}
        authError={authError}
        setAuthError={setAuthError}
        reviewData={reviewData}
        setReviewData={setReviewData}
        pickImage={pickImage}
        user={user}
        globalReviews={globalReviews}
        setGlobalReviews={setGlobalReviews}
        userExperiences={userExperiences}
        setUserExperiences={setUserExperiences}
        updateAverageRating={updateAverageRating}
        showNotification={showNotification}
      />
      <View style={styles.navBar}>
        {userRole === 'admin' ? (
          <>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('map')}><Ionicons name="map" size={20} color={activeTab === 'map' ? "#000" : "#ccc"} /><Text style={styles.navText}>KEŞFET</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('shops')}><Ionicons name="storefront" size={20} color={activeTab === 'shops' ? "#000" : "#ccc"} /><Text style={styles.navText}>MAĞAZALAR</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('appointments')}><Ionicons name="calendar" size={20} color={activeTab === 'appointments' ? "#000" : "#ccc"} /><Text style={styles.navText}>RANDEVULAR</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('admin_panel')}><Ionicons name="settings" size={20} color={activeTab === 'admin_panel' ? "#000" : "#ccc"} /><Text style={styles.navText}>SİSTEM</Text></AnimatedPressable>
          </>
        ) : userRole === 'owner' ? (
          <AnimatedPressable style={styles.navItem} onPress={() => switchTab('owner_panel')}><Ionicons name="stats-chart" size={20} color={activeTab === 'owner_panel' ? "#000" : "#ccc"} /><Text style={styles.navText}>İŞLETME PANELİ</Text></AnimatedPressable>
        ) : (
          <>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('map')}><Ionicons name="map" size={20} color={activeTab === 'map' ? "#000" : "#ccc"} /><Text style={styles.navText}>KEŞFET</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('shops')}><Ionicons name="storefront" size={20} color={activeTab === 'shops' ? "#000" : "#ccc"} /><Text style={styles.navText}>MAĞAZALAR</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('appointments')}><Ionicons name="calendar" size={20} color={activeTab === 'appointments' ? "#000" : "#ccc"} /><Text style={styles.navText}>RANDEVULAR</Text></AnimatedPressable>
            <AnimatedPressable style={styles.navItem} onPress={() => switchTab('profile')}><Ionicons name="person" size={20} color={activeTab === 'profile' ? "#000" : "#ccc"} /><Text style={styles.navText}>PROFİL</Text></AnimatedPressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationBar: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#000', padding: 15, borderRadius: 12, zIndex: 1000 },
  notificationText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  authContainer: { flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  welcomeTitle: { fontSize: 50, fontWeight: '900', marginBottom: 50 },
  authPrimaryBtn: { backgroundColor: '#000', padding: 20, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 15 },
  authPrimaryBtnText: { color: '#fff', fontWeight: 'bold' },
  authSecondaryBtn: { borderWidth: 2, borderColor: '#000', padding: 20, borderRadius: 12, alignItems: 'center', width: '100%' },
  authSecondaryBtnText: { fontWeight: 'bold' },
  authInput: { borderBottomWidth: 2, borderColor: '#000', padding: 10, marginBottom: 20, width: '100%', color: '#000' },
  map: { flex: 1 }, markerBox: { backgroundColor: '#fff', padding: 8, borderRadius: 10, borderWidth: 1.5 },
  categoryScreen: { flex: 1, padding: 30, paddingTop: 80 }, mainTitle: { fontSize: 35, fontWeight: 'bold', marginBottom: 25 },
  allMapCard: { backgroundColor: '#000', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 25 },
  allMapTitle: { color: '#fff', fontWeight: 'bold', letterSpacing: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', backgroundColor: '#f9f9f9', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 15 },
  catName: { fontSize: 11, fontWeight: 'bold', marginTop: 10 },
  tabPadding: { flex: 1, padding: 30, paddingTop: 80 }, tabTitle: { fontSize: 24, fontWeight: '900', marginBottom: 30 },
  shopCard: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  promotedCard: { backgroundColor: '#fffef0', borderColor: '#ffa502', borderWidth: 1 }, shopImage: { width: 65, height: 65, borderRadius: 12 }, shopInfo: { marginLeft: 15, flex: 1 },
  shopName: { fontWeight: 'bold', fontSize: 16 }, shopDistance: { color: '#aaa', fontSize: 12, marginTop: 4 },
  promoBadge: { backgroundColor: '#ffa502', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }, promoText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  appCard: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, marginBottom: 15 }, appShopName: { fontWeight: 'bold', fontSize: 16 }, appDate: { color: '#aaa', fontSize: 12 },
  actionBtn: { backgroundColor: '#000', padding: 10, borderRadius: 8, marginTop: 15, marginRight: 10 }, actionBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 }, profileAvatar: { width: 70, height: 70, borderRadius: 35 }, profileName: { fontWeight: 'bold', fontSize: 20, marginLeft: 15 },
  walletCard: { backgroundColor: '#000', padding: 20, borderRadius: 15, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topUpBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  expCard: { width: 150, marginRight: 15, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 15 }, expImg: { width: '100%', height: 100, borderRadius: 10 }, expText: { fontSize: 10, marginTop: 5 },
  logoutBtn: { marginTop: 40, alignItems: 'center' },
  ownerTopHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }, ownerShopName: { fontSize: 22, fontWeight: '900' },
  viewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0eeff', padding: 8, borderRadius: 10 }, viewText: { marginLeft: 5, color: '#7d5fff', fontWeight: 'bold' },
  promoPanel: { backgroundColor: '#1e272e', padding: 20, borderRadius: 20, marginBottom: 30 }, panelTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  timerText: { color: '#2ed573', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
  startBtn: { backgroundColor: '#7d5fff', padding: 15, borderRadius: 12, alignItems: 'center' }, startBtnText: { color: '#fff', fontWeight: 'bold' },
  stopBtn: { backgroundColor: '#ff4757', padding: 12, borderRadius: 12, alignItems: 'center' }, stopBtnText: { color: '#fff', fontWeight: 'bold' },
  ownerSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addManualText: { color: '#7d5fff', fontWeight: 'bold', fontSize: 12 },
  ownerAppCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  navBar: { height: 90, flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingBottom: 20, backgroundColor: '#fff' },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' }, navText: { fontSize: 9, fontWeight: 'bold', marginTop: 5 },
  closeBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  detailName: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 }, sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#aaa', marginVertical: 15, letterSpacing: 1 },
  slot: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginRight: 10, minWidth: 80, alignItems: 'center' },
  selected: { backgroundColor: '#000' }, slotText: { fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#000', padding: 18, borderRadius: 12, marginTop: 30, alignItems: 'center' }, bookBtnText: { color: '#fff', fontWeight: 'bold' },
  reviewItem: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  paymentCard: { backgroundColor: '#fff', padding: 30, borderRadius: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  payBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' }, payBtnText: { color: '#fff', fontWeight: 'bold' },
  backBtn: { position: 'absolute', top: 60, left: 20, backgroundColor: '#fff', padding: 12, borderRadius: 12, elevation: 5 },
  promoDesc: { color: '#aaa', fontSize: 12, marginBottom: 15 },
  mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  resultBadge: { position: 'absolute', top: 60, right: 20, backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  resultBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10 },
  detailRowText: { marginLeft: 10, fontSize: 14, color: '#333', flex: 1 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#000', padding: 12, borderRadius: 12, marginBottom: 20 },
  editProfileBtnText: { fontWeight: 'bold', marginLeft: 8 },
  avatarEditContainer: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  editAvatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarEditOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#000', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  expImagePicker: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  expPickerImg: { width: '100%', height: 180, borderRadius: 12 },
  expPickerPlaceholder: { width: '100%', height: 180, backgroundColor: '#f5f5f5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#eee', borderStyle: 'dashed' },
  expShopName: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  authSubtitle: { fontSize: 14, color: '#aaa', marginBottom: 35, letterSpacing: 0.5 },
  registerLink: { color: '#999', fontSize: 13 },
  registerLinkHighlight: { color: '#7d5fff', fontWeight: 'bold', textDecorationLine: 'underline', fontSize: 14 },
  roleSelector: { flexDirection: 'row', width: '100%', marginBottom: 25, gap: 10 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, borderWidth: 2, borderColor: '#000', gap: 8 },
  roleBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  roleBtnText: { fontWeight: 'bold', fontSize: 14 },
  roleBtnTextActive: { color: '#fff' }
});