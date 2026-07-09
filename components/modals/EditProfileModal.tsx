import React from 'react';
import { View, Text, Modal, TextInput, KeyboardAvoidingView, Platform, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

export const EditProfileModal: React.FC = () => {
  const {
    showEditProfileModal, setShowEditProfileModal,
    editProfileData, setEditProfileData,
    user, setUser, currentUsername, showNotification
  } = useApp();

  const pickImage = async (cb: any) => {}; // Image picking logic to be implemented later
  const updateUserInDb = async (username: string, data: any) => {};

  return (
    <Modal visible={showEditProfileModal} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.paymentCard}>
          <Text style={styles.modalTitle}>PROFİLİ DÜZENLE</Text>
          <AnimatedPressable style={styles.avatarEditContainer} onPress={() => pickImage((uri: string) => setEditProfileData({...editProfileData, avatar: uri}))}>
            <Image source={{ uri: editProfileData.avatar }} style={styles.editAvatarImg} />
            <View style={styles.avatarEditOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </AnimatedPressable>
          <TextInput 
            style={styles.authInput} 
            placeholderTextColor="#555" 
            placeholder="Ad Soyad" 
            value={editProfileData.name} 
            onChangeText={(t) => setEditProfileData({...editProfileData, name: t})} 
          />
          <TextInput 
            style={styles.authInput} 
            placeholderTextColor="#555" 
            placeholder="Kullanıcı Adı" 
            value={editProfileData.username} 
            onChangeText={(t) => setEditProfileData({...editProfileData, username: t})} 
            autoCapitalize="none" 
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable style={[styles.payBtn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setShowEditProfileModal(false)}>
              <Text style={styles.payBtnText}>İPTAL</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.payBtn, { flex: 1 }]} onPress={() => {
              const newAvatar = editProfileData.avatar;
              setUser((prev: any) => ({ ...prev, name: editProfileData.name, username: editProfileData.username, avatar: newAvatar }));
              if (currentUsername) { 
                updateUserInDb(currentUsername, { name: editProfileData.name, username: editProfileData.username, avatar: newAvatar }); 
              }
              setShowEditProfileModal(false);
              showNotification("Profil güncellendi! ✅");
            }}>
              <Text style={styles.payBtnText}>KAYDET</Text>
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  paymentCard: { backgroundColor: '#fff', padding: 30, borderRadius: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  authInput: { borderBottomWidth: 2, borderColor: '#000', padding: 10, marginBottom: 20, width: '100%', color: '#000' },
  payBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' }, 
  payBtnText: { color: '#fff', fontWeight: 'bold' },
  avatarEditContainer: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  editAvatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarEditOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#000', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
});
