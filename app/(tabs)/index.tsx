import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Dimensions } from 'react-native';
import AppMap from '../../components/AppMap';
import AdminMap from '../../components/AdminMap';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

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
  const DEFAULT_USERS: RegisteredUser[] = [
    { name: 'Ahmet Yılmaz', username: 'ahmet', password: '1234', role: 'customer', avatar: 'https://picsum.photos/id/64/200', balance: 500, experiences: [], appointments: [] },
    { name: 'Elite Salon Sahibi', username: 'elite', password: '1234', role: 'owner', shopName: 'Elite Master Salon', avatar: 'https://picsum.photos/id/65/200', balance: 250, experiences: [], appointments: [] },
  ];
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(DEFAULT_USERS);
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

  // --- DATABASE FUNCTIONS ---
  const saveUsersToStorage = useCallback(async (users: RegisteredUser[]) => {
    try { await AsyncStorage.setItem('hopop_users', JSON.stringify(users)); } catch (e) { console.log('Save error:', e); }
  }, []);

  const saveGlobalReviewsToStorage = useCallback(async (gReviews: Record<string, Review[]>) => {
    try { await AsyncStorage.setItem('hopop_global_reviews', JSON.stringify(gReviews)); } catch (e) { console.log('Save GR error:', e); }
  }, []);

  const loadDbFromStorage = useCallback(async () => {
    try {
      const uData = await AsyncStorage.getItem('hopop_users');
      let loadedUsers = DEFAULT_USERS;
      if (uData) loadedUsers = JSON.parse(uData) as RegisteredUser[];
      else await saveUsersToStorage(DEFAULT_USERS);
      setRegisteredUsers(loadedUsers);

      const loadGlobalReviewsFromStorage = async () => {
        try {
          const rData = await AsyncStorage.getItem('hopop_global_reviews');
          if (rData) setGlobalReviews(JSON.parse(rData));
          
          const reqData = await AsyncStorage.getItem('hopop_delete_requests');
          if (reqData) setDeleteRequests(JSON.parse(reqData));
        } catch (e) {}
      };
      await loadGlobalReviewsFromStorage();

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
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
        } else {
          let curr = await Location.getCurrentPositionAsync({});
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
      
      const storedUsers = await AsyncStorage.getItem('hopop_users');
      const latestUsers: RegisteredUser[] = storedUsers ? JSON.parse(storedUsers) : registeredUsers;

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

    const existingIndex = latestUsers.findIndex(userObj => userObj.username.toLowerCase() === u.toLowerCase());
    let found;
    if (existingIndex !== -1) {
      found = latestUsers[existingIndex];
    } else {
      found = {
        name: profile.full_name || u, 
        username: u, 
        password: p, 
        role: frontendRole, 
        avatar: profile.avatar_url || 'https://picsum.photos/id/64/200', 
        balance: 500, 
        experiences: [], 
        appointments: [],
        shopName: undefined
      };
      const updatedUsers = [...latestUsers, found];
      setRegisteredUsers(updatedUsers);
      saveUsersToStorage(updatedUsers);
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
      setOwnerAppointments((oApps || []).map((a: any) => ({
         id: a.id, shopId: a.shop_id, barberName: ownerShopDb.name,
         customerName: a.profiles?.full_name || 'Müşteri',
         date: new Date(a.appointment_date).toLocaleDateString(),
         time: new Date(a.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         price: a.price, type: ownerShopDb.category, status: a.status
      })));
    }
    
    setCurrentUsername(found.username);
    setUserRole(frontendRole as any);
    setUser({ id: profile.id, name: found.name, username: found.username, balance: found.balance, avatar: found.avatar });
    setUserExperiences(found.experiences || []);
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

  const handleRegister = async () => {
    try {
      setAuthError('');
      if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) { setAuthError("Lütfen tüm alanları doldurun."); return; }
      if (regRole === 'owner' && !regShopName.trim()) { setAuthError("İşletme adı zorunludur."); return; }
      if (regPassword.length < 6) { setAuthError("Şifre en az 6 karakter olmalıdır."); return; }
      
      const { data: existingProfile, error: existError } = await supabase.from('profiles').select('id').eq('username', regUsername).maybeSingle();
      if (existingProfile) { setAuthError("Bu kullanıcı adı zaten alınmış."); return; }

      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });

      if (error) {
        setAuthError("Kayıt Hatası: " + error.message);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').update({ 
          full_name: regName,
          username: regUsername,
          email: regEmail,
          role: 'customer'
        }).eq('id', data.user.id);
      }

      setLoginUsername(regUsername);
      setLoginPassword(regPassword);
      setRegName(''); setRegUsername(''); setRegPassword(''); setRegShopName(''); setRegEmail('');
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
    saveGlobalReviewsToStorage(newGlobalReviews);
    updateAverageRating(shopId, shopReviews);
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
    saveGlobalReviewsToStorage(newGlobalReviews);
    updateAverageRating(shopId, shopReviews);
    showNotification("Yorum silindi.");
  };

  if (loading || !location || !dbLoaded || authLoading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#000" /></View>;

  if (authState === 'login') {
    return (
      <View style={styles.authContainer} onStartShouldSetResponder={() => { Keyboard.dismiss(); return false; }}>
          <Text style={styles.welcomeTitle}>Hopop</Text>
          <Text style={styles.authSubtitle}>Randevuna bir adım kaldı</Text>
          {authError ? <Text style={{ color: 'red', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kullanıcı Adı" value={loginUsername} onChangeText={setLoginUsername} autoCapitalize="none" />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Şifre" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
            <TouchableOpacity style={styles.authPrimaryBtn} onPress={() => handleLogin()}><Text style={styles.authPrimaryBtnText}>GİRİŞ YAP</Text></TouchableOpacity>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={rememberMe ? "checkbox" : "square-outline"} size={20} color="#000" />
                <Text style={{ marginLeft: 8, color: '#555' }}>Beni Hatırla</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{marginTop: 20}} onPress={() => setAuthState('register')}>
            <Text style={styles.registerLink}>Hesabınız yok mu? <Text style={styles.registerLinkHighlight}>Hemen Kayıt Ol</Text></Text>
          </TouchableOpacity>
        </View>
    );
  }

  if (authState === 'register') {
    return (
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.welcomeTitle}>Hopop</Text>
          <Text style={styles.authSubtitle}>Yeni Hesap Oluştur</Text>

          <View style={styles.roleSelector}>
            <TouchableOpacity style={[styles.roleBtn, regRole === 'customer' && styles.roleBtnActive]} onPress={() => setRegRole('customer')}>
              <Ionicons name="person" size={20} color={regRole === 'customer' ? '#fff' : '#000'} />
              <Text style={[styles.roleBtnText, regRole === 'customer' && styles.roleBtnTextActive]}>Müşteri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleBtn, regRole === 'owner' && styles.roleBtnActive]} onPress={() => setRegRole('owner')}>
              <Ionicons name="storefront" size={20} color={regRole === 'owner' ? '#fff' : '#000'} />
              <Text style={[styles.roleBtnText, regRole === 'owner' && styles.roleBtnTextActive]}>İşletme</Text>
            </TouchableOpacity>
          </View>

          {authError ? <Text style={{ color: 'red', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Ad Soyad" value={regName} onChangeText={setRegName} />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kullanıcı Adı" value={regUsername} onChangeText={setRegUsername} autoCapitalize="none" />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="E-posta Adresi" value={regEmail} onChangeText={setRegEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Şifre (en az 6 karakter)" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
          {regRole === 'owner' && <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="İşletme / Dükkan Adı" value={regShopName} onChangeText={setRegShopName} />}

          <TouchableOpacity style={styles.authPrimaryBtn} onPress={handleRegister}><Text style={styles.authPrimaryBtnText}>KAYIT OL</Text></TouchableOpacity>
          <TouchableOpacity style={{marginTop: 20}} onPress={() => setAuthState('login')}>
            <Text style={styles.registerLink}>Zaten hesabınız var mı? <Text style={styles.registerLinkHighlight}>Giriş Yap</Text></Text>
          </TouchableOpacity>
        </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.notificationBar, { transform: [{ translateY: slideAnim }] }]}><Text style={styles.notificationText}>{notifText}</Text></Animated.View>

      {/* --- MÜŞTERİ PANELİ --- */}
      {userRole === 'customer' && (
        <View style={{ flex: 1 }}>
          {activeTab === 'map' && (!selectedCategory ? (
            <View style={styles.categoryScreen}>
              <Text style={styles.mainTitle}>Keşfet</Text>
              <TouchableOpacity style={styles.allMapCard} onPress={() => { setSelectedCategory('all'); }}><Text style={styles.allMapTitle}>TÜMÜNÜ KEŞFET</Text></TouchableOpacity>
              <View style={styles.categoryGrid}>{CATEGORIES_DATA.map(cat => (<TouchableOpacity key={cat.id} style={styles.categoryCard} onPress={() => { setSelectedCategory(cat.id); }}><FontAwesome5 name={cat.icon as any} size={24} color="#000" /><Text style={styles.catName}>{cat.name}</Text></TouchableOpacity>))}</View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <AppMap 
                location={location} 
                dynamicBarbers={dynamicBarbers} 
                setSelectedBarber={setSelectedBarber} 
                mapStyle={styles.map} 
                markerBoxStyle={styles.markerBox} 
              />
              {mapLoading && <View style={styles.mapLoadingOverlay}><ActivityIndicator size="large" color="#000" /><Text style={{ marginTop: 8, fontWeight: 'bold' }}>Dükkanlar aranıyor...</Text></View>}
              <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedCategory(null); setDynamicBarbers([]); }}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
              {dynamicBarbers.length > 0 && <View style={styles.resultBadge}><Text style={styles.resultBadgeText}>{dynamicBarbers.length} dükkan</Text></View>}
            </View>
          ))}

          {activeTab === 'shops' && (
            <View style={styles.tabPadding}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.tabTitle}>MAĞAZALAR</Text>
                {dynamicBarbers.length === 0 && (
                  <TouchableOpacity onPress={() => setSelectedCategory('all')} style={{backgroundColor: '#000', padding: 8, borderRadius: 8}}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>DÜKKANLARI YÜKLE</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={{ marginBottom: 15, paddingBottom: 15, minHeight: 50 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                  {[
                    { id: 'nearest', label: 'En Yakın' }, 
                    { id: 'farthest', label: 'En Uzak' }, 
                    { id: 'highest_rating', label: 'En Yüksek' }, 
                    { id: 'lowest_rating', label: 'En Düşük' }
                  ].map(opt => (
                    <TouchableOpacity key={opt.id} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: sortOption === opt.id ? '#000' : '#eee' }} onPress={() => setSortOption(opt.id as any)}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: sortOption === opt.id ? '#fff' : '#666' }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <FlatList 
                data={[...dynamicBarbers]
                  .sort((a, b) => {
                    if (sortOption === 'nearest') return (a.distance || 0) - (b.distance || 0);
                    if (sortOption === 'farthest') return (b.distance || 0) - (a.distance || 0);
                    if (sortOption === 'highest_rating') return b.rating - a.rating;
                    if (sortOption === 'lowest_rating') return a.rating - b.rating;
                    return 0;
                  })
                  .sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0))} 
                keyExtractor={item => item.id} 
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.shopCard, item.isPromoted && styles.promotedCard]} onPress={() => setSelectedBarber(item)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.shopImage} />
                    <View style={styles.shopInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.shopName}>{item.name}</Text>
                        {item.isPromoted && <View style={styles.promoBadge}><Text style={styles.promoText}>ÖNE ÇIKAN</Text></View>}
                      </View>
                      <Text style={styles.shopDistance}>
                        {item.rating.toFixed(1)} ⭐ • {item.distance !== undefined ? (item.distance > 1000 ? (item.distance/1000).toFixed(1) + ' km' : item.distance + ' m') : 'Bilinmiyor'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )} 
              />
            </View>
          )}

          {activeTab === 'appointments' && (
            <View style={styles.tabPadding}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.tabTitle}>AKTİF RANDEVULARIM</Text>
                <TouchableOpacity onPress={() => showNotification("Randevular güncel!")}>
                  <Ionicons name="refresh" size={20} color="#000" />
                </TouchableOpacity>
              </View>
              <FlatList data={appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')} keyExtractor={item => item.id} renderItem={({ item }) => (
                <View style={styles.appCard}>
                  <View style={{ flex: 1 }}><Text style={styles.appShopName}>{item.barberName}</Text><Text style={styles.appDate}>{item.date} | {item.time}</Text></View>
                  <View style={{ flexDirection: 'row' }}>
                    {item.status === 'pending' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleConfirmAppointment(item.id)}>
                        <Text style={styles.actionBtnText}>GİDECEĞİM</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'confirmed' && (
                      <Text style={{color:'#2ed573', fontWeight:'bold', marginRight:10, alignSelf:'center'}}>ONAYLI ✅</Text>
                    )}
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff4757' }]} onPress={async () => { 
                      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', item.id);
                      if (error) { Alert.alert("Hata", error.message); return; }
                      
                      const newApps = appointments.filter(a => a.id !== item.id);
                      setAppointments(newApps); 
                      setUser({ ...user, balance: user.balance + 350 }); 
                      if(currentUsername) updateUserInDb(currentUsername, { balance: user.balance + 350 });
                      showNotification("Ücret iade edildi."); 
                    }}><Text style={styles.actionBtnText}>İPTAL</Text></TouchableOpacity>
                  </View>
                </View>
              )} ListEmptyComponent={<Text style={{ color: '#aaa', textAlign: 'center', marginTop: 50 }}>Aktif randevunuz bulunmuyor.</Text>} />
            </View>
          )}

          {activeTab === 'profile' && (
            <View style={styles.tabPadding}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={[styles.tabTitle, { color: 'black' }]}>PROFİLİM</Text>
                <TouchableOpacity onPress={() => showNotification("Profil bilgileri güncel!")}>
                  <Ionicons name="refresh" size={20} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.profileHeader}>
                <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                <View style={{ marginLeft: 15 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{user.name}</Text>
                  <Text style={styles.profileName}>@{user.username}</Text>
                  <TouchableOpacity onPress={() => { setEditProfileData(user); setShowEditProfileModal(true); }} style={{ marginTop: 5 }}>
                    <Text style={{ color: '#7d5fff', fontSize: 12, fontWeight: 'bold' }}>Profili Düzenle</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.walletCard}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Bakiyem: ₺{user.balance}</Text><TouchableOpacity style={styles.topUpBtn} onPress={() => setShowTopUpModal(true)}><Text style={{ fontWeight: 'bold', fontSize: 12 }}>Bakiye Yükle</Text></TouchableOpacity></View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 15 }}>
                <Text style={[styles.sectionTitle, { marginVertical: 0 }]}>GEÇMİŞ RANDEVULARIM</Text>
              </View>
              {appointments.filter(a => a.status === 'past' || a.status === 'confirmed').length === 0 && <Text style={{ color: '#aaa', marginBottom: 20 }}>Değerlendirilecek randevu yok.</Text>}
              {appointments.filter(a => a.status === 'past' || a.status === 'confirmed').map(app => {
                const isReviewed = userExperiences.some(exp => exp.appointmentId === app.id);
                return (
                  <View key={app.id} style={{ backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontWeight: 'bold' }}>{app.barberName}</Text>
                      <Text style={{ color: '#666', fontSize: 12 }}>{app.date} • {app.time}</Text>
                    </View>
                    {isReviewed ? (
                      <Text style={{ color: '#2ed573', fontSize: 10, fontWeight: 'bold' }}>DEĞERLENDİRİLDİ</Text>
                    ) : (
                      <TouchableOpacity style={{ backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }} onPress={() => { setReviewTarget(app); setReviewData({ star: 5, comment: '', imageUrl: '' }); setShowAddExperienceModal(true); }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>DEĞERLENDİR</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <View style={styles.ownerSectionHead}>
                <Text style={styles.sectionTitle}>DENEYİMLERİM (YORUMLARIN)</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userExperiences.map(exp => (
                  <View key={exp.id} style={styles.expCard}>
                    {exp.imageUrl ? <Image source={{ uri: exp.imageUrl }} style={[styles.expImg, { resizeMode: 'contain' }]} /> : null}
                    <Text style={{ fontWeight: 'bold', fontSize: 13, marginTop: 8 }}>{exp.shopName || (exp.shopId.includes('osm-') ? "Dükkan" : exp.shopId)}</Text>
                    <Text style={{ color: '#f39c12', fontSize: 12 }}>{'⭐'.repeat(exp.star)}</Text>
                    <Text style={styles.expText} numberOfLines={3}>{exp.comment}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { 
                if (currentUsername) { updateUserInDb(currentUsername, { balance: user.balance, experiences: userExperiences, appointments }); }
                setCurrentUsername(null);
                setAuthState('login'); 
              }}><Text style={{ color: 'red', fontWeight: 'bold' }}>Çıkış Yap</Text></TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* --- İŞLETME PANELİ (FULL) --- */}
      {activeTab === 'owner_panel' && (
        <View style={styles.tabPadding}>
          {!ownerShopDb ? (
            <View style={styles.centerContainer}>
              <Ionicons name="time" size={60} color="#ccc" />
              <Text style={[styles.tabTitle, { marginTop: 20, textAlign: 'center' }]}>ONAY BEKLENİYOR</Text>
              <Text style={{ color: '#666', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 }}>
                İşletme hesabınız oluşturuldu. Sistem yöneticisi dükkanınızı haritaya ekleyip size atadığında bu panel aktif olacaktır.
              </Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { setCurrentUsername(null); setAuthState('login'); }}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>Hesaptan Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              <View style={styles.ownerTopHeader}>
                <View><Text style={styles.ownerShopName}>{ownerShop.name}</Text><Text style={{ color: '#aaa' }}>Kategori: {ownerShopDb.category?.toUpperCase()}</Text></View>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <View style={styles.viewBadge}><Ionicons name="eye" size={14} color="#7d5fff" /><Text style={styles.viewText}>{ownerShop.views}</Text></View>
                  <View style={styles.viewBadge}><Ionicons name="wallet" size={14} color="#2ed573" /><Text style={styles.viewText}>{user.balance} TL</Text></View>
                </View>
              </View>

              <View style={styles.promoPanel}>
                <Text style={styles.panelTitle}>Sponsorlu Öne Çıkarma</Text>
                {ownerShopDb.promotion_status === 'approved' ? (
                  <View>
                    <Text style={styles.timerText}>Dükkanınız Öne Çıkarıldı!</Text>
                  </View>
                ) : ownerShopDb.promotion_status === 'pending' ? (
                  <View>
                    <Text style={styles.timerText}>İsteğiniz İnceleniyor...</Text>
                    <Text style={{color:'#fff', textAlign:'center', fontSize:12}}>Admin onayı bekleniyor.</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.promoDesc}>Listede en üstte gözükmek için onay isteği gönderin.</Text>
                    <TouchableOpacity style={styles.startBtn} onPress={handleRequestPromotion}>
                      <Text style={styles.startBtnText}>ÖNE ÇIKARMA İSTE (100 TL)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.ownerSectionHead}>
                <Text style={styles.sectionTitle}>MAĞAZA VİTRİNİ</Text>
              </View>
              <View style={{ backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, marginBottom: 25 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                  {localImages.map((img, i) => (
                    <View key={i} style={{ position: 'relative' }}>
                      <Image source={{uri: img}} style={{ width: 120, height: 120, borderRadius: 12, marginRight: 10, resizeMode: 'cover' }} />
                      <TouchableOpacity style={{ position: 'absolute', top: 5, right: 15, backgroundColor: 'rgba(255,0,0,0.8)', padding: 5, borderRadius: 15, zIndex: 10 }} onPress={() => {
                        setLocalImages(localImages.filter((_, idx) => idx !== i));
                      }}>
                        <Ionicons name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.expPickerPlaceholder, {width: 120, height: 120, marginRight: 10, marginBottom: 0}]} onPress={() => pickImage((uri) => {
                     setLocalImages(prev => [...prev, uri]);
                  }, [16, 9])}>
                    <Ionicons name="add" size={40} color="#ccc" />
                    <Text style={{color:'#aaa', fontSize:12, marginTop:8, textAlign:'center'}}>Fotoğraf Ekle</Text>
                  </TouchableOpacity>
                </ScrollView>
                <TouchableOpacity style={[styles.payBtn, { marginBottom: 20 }]} onPress={async () => { 
                   const { error } = await supabase.from('shops').update({ image_url: JSON.stringify(localImages) }).eq('id', ownerShopDb.id);
                   if (!error) { 
                     setOwnerShopDb({...ownerShopDb, image_url: JSON.stringify(localImages)}); 
                     showNotification("Vitrin fotoğrafları kaydedildi! ✅"); 
                   } else {
                     showNotification("Hata: " + error.message);
                   }
                }}>
                  <Text style={styles.payBtnText}>FOTOĞRAFLARI KAYDET</Text>
                </TouchableOpacity>

                <Text style={{ fontWeight:'bold', marginBottom:10 }}>Çalışma Saatleri (Müşterilerin Seçebileceği Saatler)</Text>
                <View style={{flexDirection:'row', flexWrap:'wrap', gap:10}}>
                   {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(t => {
                      const isActive = (ownerShopDb.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"]).includes(t);
                      return (
                        <TouchableOpacity key={t} style={[styles.slot, isActive && styles.selected, {minWidth:70, padding:10, marginBottom: 5}]} onPress={async () => {
                           const currentHours = ownerShopDb.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"];
                           const newHours = isActive ? currentHours.filter((h:string) => h !== t) : [...currentHours, t].sort();
                           const { error } = await supabase.from('shops').update({ working_hours: newHours }).eq('id', ownerShopDb.id);
                           if (!error) { setOwnerShopDb({...ownerShopDb, working_hours: newHours}); showNotification("Saatler kaydedildi."); }
                        }}>
                          <Text style={[styles.slotText, isActive && { color: '#fff' }]}>{t}</Text>
                        </TouchableOpacity>
                      )
                   })}
                </View>
              </View>

              <View style={styles.ownerSectionHead}>
                <Text style={styles.sectionTitle}>GELEN RANDEVULAR</Text>
                <View style={{flexDirection:'row', gap:10, alignItems: 'center'}}>
                  <TouchableOpacity onPress={async () => {
                     const { data: oApps } = await supabase.from('appointments').select('*, profiles(full_name)').eq('shop_id', ownerShopDb.id).order('created_at', { ascending: false });
                     setOwnerAppointments((oApps || []).map((a: any) => ({
                        id: a.id, shopId: a.shop_id, barberName: ownerShopDb.name,
                        customerName: a.profiles?.full_name || 'Müşteri',
                        date: new Date(a.appointment_date).toLocaleDateString(),
                        time: new Date(a.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        price: a.price, type: ownerShopDb.category, status: a.status
                     })));
                     showNotification("Randevular yenilendi!");
                  }}>
                    <Ionicons name="refresh" size={20} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowManualAddModal(true)}><Text style={styles.addManualText}>+ ELLE EKLE</Text></TouchableOpacity>
                </View>
              </View>
              {ownerAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length === 0 ? (
                 <Text style={{ color: '#aaa', textAlign: 'center', marginVertical: 20 }}>Randevu yok.</Text>
              ) : (
                 ownerAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').map(item => (
                  <View key={item.id} style={styles.ownerAppCard}>
                    <View>
                      <Text style={{ fontWeight: 'bold' }}>{item.customerName}</Text>
                      <Text style={{ color: '#aaa', fontSize: 12 }}>{item.date} • {item.time}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                       {item.status === 'confirmed' ? <Ionicons name="checkmark-circle" size={24} color="#2ed573" /> : <Text style={{color:'#f39c12', fontWeight:'bold', fontSize:12}}>BEKLİYOR (Ödendi)</Text>}
                    </View>
                  </View>
                 ))
              )}
              <View style={[styles.ownerSectionHead, { marginTop: 20 }]}>
                <Text style={styles.sectionTitle}>MAĞAZA YORUMLARI</Text>
              </View>
              {(() => {
                const ownerReviews = Object.values(globalReviews).flat().filter(r => r.shopId === ownerShopDb.id || r.shopName === ownerShopDb.name);
                return ownerReviews.length === 0 ? (
                  <Text style={{color:'#aaa', marginBottom: 20}}>Henüz mağazanıza yapılmış bir değerlendirme bulunmuyor.</Text>
                ) : (
                  <View style={{ marginBottom: 20 }}>
                    {ownerReviews.map(r => {
                      const isDeleteRequested = deleteRequests.some(req => req.reviewId === r.id);
                    return (
                      <View key={r.id} style={{ backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Image source={{ uri: r.userAvatar || 'https://i.pravatar.cc/150' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                          <View>
                            <Text style={{ fontWeight: 'bold' }}>{r.user}</Text>
                            <Text style={{ color: '#aaa', fontSize: 10 }}>{r.date}</Text>
                          </View>
                          <Text style={{ marginLeft: 'auto', color: '#f39c12' }}>{'⭐'.repeat(r.star)}</Text>
                        </View>
                        <Text style={{ color: '#333', marginBottom: 10 }}>{r.comment}</Text>
                        {r.imageUrl && <Image source={{uri: r.imageUrl}} style={{width: '100%', height: 200, resizeMode: 'contain', borderRadius: 10, marginBottom: 10}} />}
                        <TouchableOpacity 
                          style={{ backgroundColor: isDeleteRequested ? '#ccc' : '#ff4757', padding: 10, borderRadius: 8, alignItems: 'center' }} 
                          disabled={isDeleteRequested}
                          onPress={() => handleDeleteRequest(r.id, ownerShopDb.id, ownerShopDb.name, r.comment)}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isDeleteRequested ? "SİLME İSTEĞİ GÖNDERİLDİ" : "YORUMU SİL (ONAYA GÖNDER)"}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                );
              })()}
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { setCurrentUsername(null); setAuthState('login'); }}><Text style={{ color: 'red', fontWeight:'bold', marginBottom:40 }}>Panelden Çıkış</Text></TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

      {/* --- ADMİN PANELİ (SİSTEM) --- */}
      {activeTab === 'admin_panel' && (
        <ScrollView style={styles.tabPadding} showsVerticalScrollIndicator={false}>
          <Text style={styles.tabTitle}>SİSTEM YÖNETİMİ</Text>
          
          <View style={styles.promoPanel}>
            <Text style={styles.panelTitle}>ÖNE ÇIKARMA İSTEKLERİ</Text>
            {promoRequests.length === 0 ? <Text style={{color:'#aaa'}}>Bekleyen istek yok.</Text> : promoRequests.map(req => (
              <View key={req.id} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:8, marginBottom:10}}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>{req.name}</Text>
                <TouchableOpacity style={{backgroundColor:'#2ed573', padding:8, borderRadius:5}} onPress={() => handleApprovePromotion(req.id)}>
                  <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>ONAYLA</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={[styles.promoPanel, { backgroundColor: '#ff4757' }]}>
            <Text style={styles.panelTitle}>YORUM SİLME İSTEKLERİ</Text>
            {deleteRequests.length === 0 ? <Text style={{color:'#fff', opacity: 0.8}}>Bekleyen silme isteği yok.</Text> : deleteRequests.map(req => (
              <View key={req.reviewId} style={{backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:8, marginBottom:10}}>
                <Text style={{color:'#fff', fontWeight:'bold', marginBottom: 5}}>{req.shopName}</Text>
                <Text style={{color:'#fff', opacity:0.8, fontSize:12, marginBottom: 10}}>{req.comment}</Text>
                <View style={{flexDirection:'row', gap: 10}}>
                  <TouchableOpacity style={{backgroundColor:'#2ed573', padding:8, borderRadius:5, flex:1, alignItems:'center'}} onPress={() => approveDeleteRequest(req.reviewId, req.shopId)}>
                    <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>ONAYLA (SİL)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{backgroundColor:'#ccc', padding:8, borderRadius:5, flex:1, alignItems:'center'}} onPress={() => rejectDeleteRequest(req.reviewId)}>
                    <Text style={{color:'#333', fontSize:12, fontWeight:'bold'}}>REDDET</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>YENİ DÜKKAN EKLE</Text>
          <View style={{ height: 350, borderRadius: 15, overflow: 'hidden', marginBottom: 15 }}>
            <AdminMap style={{ flex: 1 }} selectedLocation={newShopLocation} onMapPress={(e: any) => setNewShopLocation(e.nativeEvent.coordinate)} systemShops={systemShops} />
          </View>
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="İşletmecinin Kullanıcı Adı (Örn: emre123)" value={newShopOwnerUsername} onChangeText={setNewShopOwnerUsername} autoCapitalize="none" />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Dükkan Adı" value={newShopData.name} onChangeText={(t) => setNewShopData({...newShopData, name: t})} />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kategori (berber, kuaför, tırnak, güzellik)" value={newShopCategory} onChangeText={setNewShopCategory} autoCapitalize="none" />
          <TextInput style={[styles.authInput, { height: 60 }]} placeholderTextColor="#555" placeholder="Hizmet Açıklaması" value={newShopData.description} onChangeText={(t) => setNewShopData({...newShopData, description: t})} multiline />
          <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Açık Adres" value={newShopData.address} onChangeText={(t) => setNewShopData({...newShopData, address: t})} />
          <TouchableOpacity style={styles.authPrimaryBtn} onPress={handleCreateShop}>
            <Text style={styles.authPrimaryBtnText}>DÜKKANI SİSTEME EKLE</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, {marginTop: 30}]}>SİSTEMDEKİ DÜKKANLAR VE YORUMLARI</Text>
          {systemShops.map(shop => (
             <View key={shop.id} style={{padding:15, backgroundColor:'#f9f9f9', borderRadius:10, marginBottom:10}}>
               <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                 <Text style={{fontWeight:'bold', fontSize:16}}>{shop.name}</Text>
                 <TouchableOpacity onPress={() => handleDeleteShop(shop.id)}><Ionicons name="trash" size={20} color="#ff4757" /></TouchableOpacity>
               </View>
               <TouchableOpacity style={{backgroundColor:'#3498db', padding:8, borderRadius:5, alignItems:'center', marginBottom: 10}} onPress={() => { setReviewTarget({id: '', shopId: shop.id, barberName: shop.name, date: '', time: '', price: 0, type: '', customerName: '', status: 'active'}); setReviewData({star: 5, comment: '', imageUrl: ''}); setShowAddExperienceModal(true); }}>
                  <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>+ BU DÜKKANA YORUM EKLE</Text>
               </TouchableOpacity>
               {(globalReviews[shop.id] || []).length === 0 ? <Text style={{color:'#aaa', fontSize: 12}}>Yorum yok.</Text> : (globalReviews[shop.id] || []).map(r => (
                  <View key={r.id} style={{backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:8, borderWidth: 1, borderColor: '#eee'}}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                      <Text style={{fontWeight:'bold', fontSize: 12}}>{r.user} • {'⭐'.repeat(r.star)}</Text>
                      <TouchableOpacity onPress={() => deleteReviewDirectly(r.id, shop.id)}><Ionicons name="trash" size={16} color="#ff4757" /></TouchableOpacity>
                    </View>
                    <Text style={{color:'#666', fontSize: 11, marginTop: 4}}>{r.comment}</Text>
                  </View>
               ))}
             </View>
          ))}
          
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { setCurrentUsername(null); setAuthState('login'); }}><Text style={{ color: 'red', fontWeight:'bold', marginBottom:40 }}>Çıkış Yap</Text></TouchableOpacity>
        </ScrollView>
      )}

      {/* MODALLAR */}
      {selectedBarber && (
        <Modal visible={!!selectedBarber} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={(e) => {
             if(!selectedBarber.modalWidth) setSelectedBarber({...selectedBarber, modalWidth: e.nativeEvent.layout.width});
          }}>
            <View style={{ height: 250, position: 'relative' }}>
              <Image source={{ uri: selectedBarber.images[modalImageIndex] }} style={{ width: selectedBarber.modalWidth || Dimensions.get('window').width, height: 250, resizeMode: 'contain', backgroundColor: '#000' }} />
              
              {selectedBarber.images.length > 1 && (
                <>
                  {modalImageIndex > 0 && (
                    <TouchableOpacity style={{ position: 'absolute', left: 10, top: 110, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }} onPress={() => setModalImageIndex(modalImageIndex - 1)}>
                      <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {modalImageIndex < selectedBarber.images.length - 1 && (
                    <TouchableOpacity style={{ position: 'absolute', right: 10, top: 110, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }} onPress={() => setModalImageIndex(modalImageIndex + 1)}>
                      <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}
              
              <TouchableOpacity style={styles.closeBtn} onPress={() => { setSelectedBarber(null); setModalImageIndex(0); }}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.detailName}>{selectedBarber.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.categoryBadge, { backgroundColor: selectedBarber.type === 'berber' ? '#3498db' : selectedBarber.type === 'kuaför' ? '#e84393' : selectedBarber.type === 'tırnak' ? '#fd79a8' : '#a29bfe' }]}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{selectedBarber.type === 'berber' ? 'BERBER' : selectedBarber.type === 'kuaför' ? 'KUAFÖR' : selectedBarber.type === 'tırnak' ? 'NAIL ART' : 'GÜZELLİK'}</Text>
                </View>
                <Text style={{ marginLeft: 10, fontSize: 15, color: '#f39c12' }}>⭐ {selectedBarber.rating.toFixed(1)}</Text>
              </View>

              {selectedBarber.address ? <View style={styles.detailRow}><Ionicons name="location" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.address}</Text></View> : null}
              {selectedBarber.phone ? <View style={styles.detailRow}><Ionicons name="call" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.phone}</Text></View> : null}
              {selectedBarber.openingHours ? <View style={styles.detailRow}><Ionicons name="time" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.openingHours}</Text></View> : null}
              {selectedBarber.website ? <View style={styles.detailRow}><Ionicons name="globe" size={18} color="#666" /><Text style={[styles.detailRowText, { color: '#3498db' }]} numberOfLines={1}>{selectedBarber.website}</Text></View> : null}
              {selectedBarber.description ? <Text style={{ color: '#555', fontSize: 13, marginTop: 10, lineHeight: 20 }}>{selectedBarber.description}</Text> : null}

              <Text style={styles.sectionTitle}>SAAT SEÇİN (350 TL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(selectedBarber.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"]).map((t: string) => (
                  <TouchableOpacity key={t} style={[styles.slot, selectedTime === t && styles.selected]} onPress={() => setSelectedTime(t)}>
                    <Text style={[styles.slotText, selectedTime === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={[styles.payBtn, { marginBottom: 20 }]} onPress={() => {
                if (userRole === 'customer') {
                  handlePayment();
                } else {
                  showNotification("Sadece müşteriler randevu alabilir.");
                }
              }}>
                <Text style={styles.payBtnText}>RANDEVU AL VE ÖDEMEYE GEÇ (₺350)</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>MÜŞTERİ DENEYİMLERİ</Text>
              {(globalReviews[selectedBarber.id] || []).length === 0 ? <Text style={{color:'#aaa', marginBottom: 20}}>Henüz değerlendirme yok.</Text> : (
                <View style={{ marginBottom: 20 }}>
                  {(globalReviews[selectedBarber.id] || []).map(r => (
                    <View key={r.id} style={{ backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Image source={{ uri: r.userAvatar || 'https://i.pravatar.cc/150' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                        <View>
                          <Text style={{ fontWeight: 'bold' }}>{r.user}</Text>
                          <Text style={{ color: '#aaa', fontSize: 10 }}>{r.date}</Text>
                        </View>
                        <Text style={{ marginLeft: 'auto', color: '#f39c12' }}>{'⭐'.repeat(r.star)}</Text>
                      </View>
                      <Text style={{ color: '#333' }}>{r.comment}</Text>
                      {r.imageUrl && <Image source={{uri: r.imageUrl}} style={{width: '100%', height: 200, resizeMode: 'contain', borderRadius: 10, marginTop: 10}} />}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      <Modal visible={showTopUpModal} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.paymentCard}><Text style={styles.modalTitle}>BAKİYE YÜKLE</Text><TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Yüklenecek Tutar" keyboardType="numeric" value={topUpAmount} onChangeText={setTopUpAmount} /><View style={{flexDirection:'row', gap:10}}><TouchableOpacity style={[styles.payBtn, {backgroundColor: '#ccc', flex:1}]} onPress={() => setShowTopUpModal(false)}><Text style={styles.payBtnText}>İPTAL</Text></TouchableOpacity><TouchableOpacity style={[styles.payBtn, {flex: 1}]} onPress={() => { const amt = parseFloat(topUpAmount) || 100; const newB = user.balance + amt; setUser({ ...user, balance: newB }); if(currentUsername) updateUserInDb(currentUsername, { balance: newB }); setShowTopUpModal(false); setTopUpAmount(''); showNotification(`${amt} TL Yüklendi!`); }}><Text style={styles.payBtnText}>YÜKLE</Text></TouchableOpacity></View></View></View></Modal>

      <Modal visible={showManualAddModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={styles.paymentCard}><Text style={styles.modalTitle}>MANUEL RANDEVU</Text><TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Müşteri Adı" /><TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Saat (Örn: 10:30)" /><View style={{flexDirection:'row', gap:10}}><TouchableOpacity style={[styles.payBtn, {backgroundColor: '#ccc', flex:1}]} onPress={() => setShowManualAddModal(false)}><Text style={styles.payBtnText}>İPTAL</Text></TouchableOpacity><TouchableOpacity style={[styles.payBtn, {flex:1}]} onPress={() => { setOwnerAppointments([...ownerAppointments, { id: 'm1', shopId: 'osm-1', barberName: '', date: 'Bugün', time: '10:30', price: 0, type: '', customerName: 'Dükkan Müşterisi', status: 'active' }]); setShowManualAddModal(false); }}><Text style={styles.payBtnText}>KAYDET</Text></TouchableOpacity></View></View></View></Modal>

      <Modal visible={showEditProfileModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.paymentCard}>
            <Text style={styles.modalTitle}>PROFİLİ DÜZENLE</Text>
            <TouchableOpacity style={styles.avatarEditContainer} onPress={() => pickImage(uri => setEditProfileData({...editProfileData, avatar: uri}))}>
                <Image source={{ uri: editProfileData.avatar }} style={styles.editAvatarImg} />
                <View style={styles.avatarEditOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Ad Soyad" value={editProfileData.name} onChangeText={(t) => setEditProfileData({...editProfileData, name: t})} />
              <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kullanıcı Adı" value={editProfileData.username} onChangeText={(t) => setEditProfileData({...editProfileData, username: t})} autoCapitalize="none" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.payBtn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setShowEditProfileModal(false)}><Text style={styles.payBtnText}>İPTAL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.payBtn, { flex: 1 }]} onPress={() => {
                  const newAvatar = editProfileData.avatar;
                  setUser(prev => ({ ...prev, name: editProfileData.name, username: editProfileData.username, avatar: newAvatar }));
                  if (currentUsername) { updateUserInDb(currentUsername, { name: editProfileData.name, username: editProfileData.username, avatar: newAvatar }); }
                  setShowEditProfileModal(false);
                  showNotification("Profil güncellendi! ✅");
                }}><Text style={styles.payBtnText}>KAYDET</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAddExperienceModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.paymentCard}>
            <Text style={styles.modalTitle}>DENEYİM DEĞERLENDİR</Text>
              <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 15}}>{reviewTarget?.barberName}</Text>
              
              <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 20}}>
                {[1,2,3,4,5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setReviewData({...reviewData, star: s})}>
                    <Text style={{fontSize: 30, color: s <= reviewData.star ? '#f39c12' : '#ccc', marginHorizontal: 5}}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}} onPress={() => pickImage(uri => setReviewData({...reviewData, imageUrl: uri}))}>
                {reviewData.imageUrl ? 
                  <Image source={{ uri: reviewData.imageUrl }} style={{width: 80, height: 80, borderRadius: 12, marginRight: 15, backgroundColor: '#eee'}} />
                  : <View style={{width: 80, height: 80, borderRadius: 12, marginRight: 15, backgroundColor: '#eee', justifyContent:'center', alignItems:'center'}}><Ionicons name="camera" size={30} color="#ccc"/></View>
                }
                <View><Text style={{fontWeight: 'bold', color: '#7d5fff'}}>Fotoğraf Ekle (İsteğe Bağlı)</Text></View>
              </TouchableOpacity>
              
              <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Yorumunuz (İsteğe Bağlı)" value={reviewData.comment} onChangeText={(t) => setReviewData({...reviewData, comment: t})} multiline />
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.payBtn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setShowAddExperienceModal(false)}><Text style={styles.payBtnText}>İPTAL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.payBtn, { flex: 1 }]} onPress={() => { 
                  if(reviewTarget) {
                    const newRev: Review = { id: Math.random().toString(), user: user.name, userAvatar: user.avatar, shopId: reviewTarget.shopId, shopName: reviewTarget.barberName, appointmentId: reviewTarget.id, comment: reviewData.comment || 'Puanlandı.', star: reviewData.star, imageUrl: reviewData.imageUrl, date: new Date().toLocaleDateString() };
                    const shopReviews = [...(globalReviews[reviewTarget.shopId] || []), newRev];
                    const newGlobalReviews = {...globalReviews, [reviewTarget.shopId]: shopReviews};
                    const newExps = [newRev, ...userExperiences];
                    
                    setGlobalReviews(newGlobalReviews);
                    setUserExperiences(newExps);
                    
                    updateAverageRating(reviewTarget.shopId, shopReviews);
                    
                    if (currentUsername) {
                      updateUserInDb(currentUsername, { experiences: newExps });
                    }
                    saveGlobalReviewsToStorage(newGlobalReviews);
                  }
                  setShowAddExperienceModal(false); 
                  showNotification("Değerlendirme kaydedildi! 🎉"); 
                }}><Text style={styles.payBtnText}>GÖNDER</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
      </Modal>
      <View style={styles.navBar}>
        {userRole === 'admin' ? (
          <>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}><Ionicons name="map" size={20} color={activeTab === 'map' ? "#000" : "#ccc"} /><Text style={styles.navText}>KEŞFET</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('shops')}><Ionicons name="storefront" size={20} color={activeTab === 'shops' ? "#000" : "#ccc"} /><Text style={styles.navText}>MAĞAZALAR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('appointments')}><Ionicons name="calendar" size={20} color={activeTab === 'appointments' ? "#000" : "#ccc"} /><Text style={styles.navText}>RANDEVULAR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('admin_panel')}><Ionicons name="settings" size={20} color={activeTab === 'admin_panel' ? "#000" : "#ccc"} /><Text style={styles.navText}>SİSTEM</Text></TouchableOpacity>
          </>
        ) : userRole === 'owner' ? (
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('owner_panel')}><Ionicons name="stats-chart" size={20} color={activeTab === 'owner_panel' ? "#000" : "#ccc"} /><Text style={styles.navText}>İŞLETME PANELİ</Text></TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}><Ionicons name="map" size={20} color={activeTab === 'map' ? "#000" : "#ccc"} /><Text style={styles.navText}>KEŞFET</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('shops')}><Ionicons name="storefront" size={20} color={activeTab === 'shops' ? "#000" : "#ccc"} /><Text style={styles.navText}>MAĞAZALAR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('appointments')}><Ionicons name="calendar" size={20} color={activeTab === 'appointments' ? "#000" : "#ccc"} /><Text style={styles.navText}>RANDEVULAR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}><Ionicons name="person" size={20} color={activeTab === 'profile' ? "#000" : "#ccc"} /><Text style={styles.navText}>PROFİL</Text></TouchableOpacity>
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