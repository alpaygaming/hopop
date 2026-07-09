import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface ProfileScreenProps {
  user: any;
  appointments: any[];
  userExperiences: any[];
  onRefreshProfile: () => void;
  onEditProfile: () => void;
  onTopUp: () => void;
  onAddReview: (app: any) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  appointments,
  userExperiences,
  onRefreshProfile,
  onEditProfile,
  onTopUp,
  onAddReview,
  onLogout
}) => {
  return (
    <ScrollView style={styles.tabPadding} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={[styles.tabTitle, { color: 'black' }]}>PROFİLİM</Text>
        <AnimatedPressable onPress={onRefreshProfile}>
          <Ionicons name="refresh" size={20} color="#000" />
        </AnimatedPressable>
      </View>
      <View style={styles.profileHeader}>
        <Image source={{ uri: user?.avatar }} style={styles.profileAvatar} />
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{user?.name}</Text>
          <Text style={styles.profileName}>@{user?.username}</Text>
          <AnimatedPressable onPress={onEditProfile} style={{ marginTop: 5 }}>
            <Text style={{ color: '#7d5fff', fontSize: 12, fontWeight: 'bold' }}>Profili Düzenle</Text>
          </AnimatedPressable>
        </View>
      </View>
      <View style={styles.walletCard}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Bakiyem: ₺{user?.balance}</Text>
        <AnimatedPressable style={styles.topUpBtn} onPress={onTopUp}>
          <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Bakiye Yükle</Text>
        </AnimatedPressable>
      </View>
      
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
              <AnimatedPressable style={{ backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }} onPress={() => onAddReview(app)}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>DEĞERLENDİR</Text>
              </AnimatedPressable>
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
      <AnimatedPressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>Çıkış Yap</Text>
      </AnimatedPressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabPadding: { flex: 1, padding: 20 },
  tabTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -1 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#666', marginVertical: 20, letterSpacing: 1 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#f9f9f9', padding: 15, borderRadius: 16 },
  profileAvatar: { width: 70, height: 70, borderRadius: 35, marginRight: 20, borderWidth: 2, borderColor: '#eee' },
  profileName: { color: '#666', fontSize: 14 },
  walletCard: { backgroundColor: '#000', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.2, shadowRadius:5, elevation:5 },
  topUpBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  expCard: { width: 220, backgroundColor: '#fff', marginRight: 15, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  expImg: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f9f9f9' },
  expText: { color: '#666', fontSize: 12, marginTop: 5, lineHeight: 18 },
  logoutBtn: { backgroundColor: '#ffeeee', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, borderWidth: 1, borderColor: '#ffcccc' },
  ownerSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});
