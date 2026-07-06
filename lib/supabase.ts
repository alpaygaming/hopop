import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://jglljknwxbqdxvuaromw.supabase.co/';
const supabaseAnonKey = 'sb_publishable_y6qF2pIvwYiAPlEsSlRIzA_rxzHDL-I';

// Web ortamında (Vercel vb.) AsyncStorage "window" arar ve SSR sırasında çöker.
// Bu yüzden sadece mobil uygulamalarda AsyncStorage kullanıyoruz.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
