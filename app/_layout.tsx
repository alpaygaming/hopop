import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { RegisterScreen } from '@/components/screens/RegisterScreen';
import { BarberDetailModal } from '@/components/modals/BarberDetailModal';
import { TopUpModal } from '@/components/modals/TopUpModal';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { AddExperienceModal } from '@/components/modals/AddExperienceModal';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootContainer() {
  const colorScheme = useColorScheme();
  const { userRole, setUserRole, authLoading, setAuthLoading, setUser, setSystemShops, setPromoRequests, setOwnerShopDb, setCurrentUsername } = useApp();
  const [authState, setAuthState] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');

  // Login Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'customer' | 'owner'>('customer');

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

  const handleLogin = async (overrideUser?: string, overridePass?: string) => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const u = overrideUser || loginUsername;
      const p = overridePass || loginPassword;

      if (!u.trim() || !p.trim()) { setAuthError("Lütfen tüm alanları doldurun."); setAuthLoading(false); return; }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, avatar_url')
        .eq('username', u)
        .maybeSingle();

      if (profileError || !profile || !profile.email) {
        setAuthError("Böyle bir kullanıcı bulunamadı."); 
        setAuthLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: p
      });

      if (error) { 
        setAuthError("Şifreniz hatalı: " + error.message); 
        setAuthLoading(false);
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
        }
      }

      setCurrentUsername(u);
      setUser({
        id: profile.id,
        name: profile.full_name || u,
        username: u,
        avatar: profile.avatar_url || 'https://picsum.photos/id/64/200',
        balance: 500
      });

      if (rememberMe) {
        await AsyncStorage.setItem('hopop_session', JSON.stringify({ username: u, password: p }));
      } else {
        await AsyncStorage.removeItem('hopop_session');
      }

      setUserRole(frontendRole);
    } catch (e) {
      setAuthError('Giriş yapılamadı.');
    }
    setAuthLoading(false);
  };

  const handleRegister = async (role: any, name: string, username: string, email: string, pass: string, shopName: string) => {
    setAuthLoading(true);
    setAuthError('');
    if (!name.trim() || !username.trim() || !pass.trim() || !email.trim()) {
      setAuthError("Lütfen tüm alanları doldurun.");
      setAuthLoading(false);
      return;
    }
    if (pass.length < 6) {
      setAuthError("Şifre en az 6 karakter olmalıdır.");
      setAuthLoading(false);
      return;
    }

    const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUser) {
      setAuthError("Bu kullanıcı adı zaten alınmış.");
      setAuthLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: pass,
    });

    if (authError) {
      setAuthError("Kayıt olunamadı: " + authError.message);
      setAuthLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').update({
        username: username,
        full_name: name,
        role: role,
      }).eq('id', authData.user.id);

      if (profileError) {
        setAuthError("Profil oluşturulamadı: " + profileError.message);
        setAuthLoading(false);
        return;
      }
    }

    setLoginUsername(username);
    setLoginPassword(pass);
    await handleLogin(username, pass);
  };

  if (authLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#000" /></View>;
  }

  if (!userRole) {
    if (authState === 'login') {
      return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
           <LoginScreen 
              onLogin={handleLogin}
              onNavigateRegister={() => setAuthState('register')}
              authError={authError}
           />
        </ThemeProvider>
      );
    } else {
      return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
           <RegisterScreen
              onRegister={handleRegister}
              onNavigateLogin={() => setAuthState('login')}
              authError={authError}
           />
        </ThemeProvider>
      );
    }
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />

      {/* Global Modals */}
      <BarberDetailModal />
      <TopUpModal />
      <EditProfileModal />
      <AddExperienceModal />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootContainer />
    </AppProvider>
  );
}
