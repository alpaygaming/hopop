import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { UserRole } from '@/types';

interface RegisterScreenProps {
  onRegister: (role: UserRole, name: string, username: string, email: string, pass: string, shopName: string) => Promise<void>;
  onNavigateLogin: () => void;
  authError: string | null;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onNavigateLogin, authError }) => {
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
      <Text style={styles.welcomeTitle}>Hopop</Text>
      <Text style={styles.authSubtitle}>Yeni Hesap Oluştur</Text>

      <View style={styles.roleSelector}>
        <TouchableOpacity style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]} onPress={() => setRole('customer')}>
          <Ionicons name="person" size={20} color={role === 'customer' ? '#fff' : '#000'} />
          <Text style={[styles.roleBtnText, role === 'customer' && styles.roleBtnTextActive]}>Müşteri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]} onPress={() => setRole('owner')}>
          <Ionicons name="storefront" size={20} color={role === 'owner' ? '#fff' : '#000'} />
          <Text style={[styles.roleBtnText, role === 'owner' && styles.roleBtnTextActive]}>İşletme</Text>
        </TouchableOpacity>
      </View>

      {authError ? <Text style={{ color: 'red', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
      
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Ad Soyad" value={name} onChangeText={setName} />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kullanıcı Adı" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="E-posta Adresi" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Şifre (en az 6 karakter)" value={password} onChangeText={setPassword} secureTextEntry />
      {role === 'owner' && <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="İşletme / Dükkan Adı" value={shopName} onChangeText={setShopName} />}

      <AnimatedPressable style={styles.authPrimaryBtn} onPress={() => onRegister(role, name, username, email, password, shopName)}>
        <Text style={styles.authPrimaryBtnText}>KAYIT OL</Text>
      </AnimatedPressable>
      
      <TouchableOpacity style={{marginTop: 20}} onPress={onNavigateLogin}>
        <Text style={styles.registerLink}>Zaten hesabınız var mı? <Text style={styles.registerLinkHighlight}>Giriş Yap</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  authContainer: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  welcomeTitle: { fontSize: 48, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 5, letterSpacing: -2 },
  authSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  roleSelector: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#eee', borderRadius: 12, padding: 4 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8 },
  roleBtnActive: { backgroundColor: '#000' },
  roleBtnText: { marginLeft: 8, fontWeight: 'bold', color: '#000' },
  roleBtnTextActive: { color: '#fff' },
  authInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, color: '#000', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  authPrimaryBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  authPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  registerLink: { textAlign: 'center', color: '#666', fontSize: 14 },
  registerLinkHighlight: { color: '#000', fontWeight: 'bold' },
});
