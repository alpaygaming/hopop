import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface LoginScreenProps {
  onLogin: (username: string, pass: string) => Promise<void>;
  onNavigateRegister: () => void;
  authError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateRegister, authError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <View style={styles.authContainer} onStartShouldSetResponder={() => { Keyboard.dismiss(); return false; }}>
      <Text style={styles.welcomeTitle}>Hopop</Text>
      <Text style={styles.authSubtitle}>Randevuna bir adım kaldı</Text>
      
      {authError ? <Text style={{ color: 'red', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
      
      <TextInput 
        style={styles.authInput} 
        placeholderTextColor="#555" 
        placeholder="Kullanıcı Adı" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.authInput} 
        placeholderTextColor="#555" 
        placeholder="Şifre" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      <AnimatedPressable style={styles.authPrimaryBtn} onPress={() => onLogin(username, password)}>
        <Text style={styles.authPrimaryBtnText}>GİRİŞ YAP</Text>
      </AnimatedPressable>
        
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, justifyContent: 'center' }}>
        <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={rememberMe ? "checkbox" : "square-outline"} size={20} color="#000" />
          <Text style={{ marginLeft: 8, color: '#555' }}>Beni Hatırla</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={{marginTop: 20}} onPress={onNavigateRegister}>
        <Text style={styles.registerLink}>Hesabınız yok mu? <Text style={styles.registerLinkHighlight}>Hemen Kayıt Ol</Text></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  welcomeTitle: { fontSize: 48, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 5, letterSpacing: -2 },
  authSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  authInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, color: '#000', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  authPrimaryBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  authPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  registerLink: { textAlign: 'center', color: '#666', fontSize: 14 },
  registerLinkHighlight: { color: '#000', fontWeight: 'bold' },
});
