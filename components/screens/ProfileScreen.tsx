import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

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
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl}}>
        <Text style={[styles.tabTitle, { color: colors.primary }]}>PROFİLİM</Text>
        <AnimatedPressable onPress={onRefreshProfile}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </AnimatedPressable>
      </View>
      <View style={styles.profileHeader}>
        <Image source={{ uri: user?.avatar }} style={styles.profileAvatar} />
        <View>
          <Text style={{ ...typography.h3 }}>{user?.name}</Text>
          <Text style={styles.profileName}>@{user?.username}</Text>
          <AnimatedPressable onPress={onEditProfile} style={{ marginTop: spacing.xs }}>
            <Text style={{ color: colors.accent.purple, ...typography.caption }}>Profili Düzenle</Text>
          </AnimatedPressable>
        </View>
      </View>
      <View style={styles.walletCard}>
        <Text style={{ color: colors.background, ...typography.body }}>Bakiyem: ₺{user?.balance}</Text>
        <AnimatedPressable style={styles.topUpBtn} onPress={onTopUp}>
          <Text style={{ ...typography.caption, color: colors.primary }}>Bakiye Yükle</Text>
        </AnimatedPressable>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.md }}>
        <Text style={[styles.sectionTitle, { marginVertical: 0 }]}>GEÇMİŞ RANDEVULARIM</Text>
      </View>
      {appointments.filter(a => a.status === 'past' || a.status === 'confirmed').length === 0 && <Text style={{ color: colors.text.muted, marginBottom: spacing.xl }}>Değerlendirilecek randevu yok.</Text>}
      {appointments.filter(a => a.status === 'past' || a.status === 'confirmed').map(app => {
        const isReviewed = userExperiences.some(exp => exp.appointmentId === app.id);
        return (
          <View key={app.id} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ ...typography.body }}>{app.barberName}</Text>
              <Text style={{ color: colors.text.muted, ...typography.caption }}>{app.date} • {app.time}</Text>
            </View>
            {isReviewed ? (
              <Text style={{ color: colors.accent.green, ...typography.label }}>DEĞERLENDİRİLDİ</Text>
            ) : (
              <AnimatedPressable style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm }} onPress={() => onAddReview(app)}>
                <Text style={{ color: colors.background, ...typography.label }}>DEĞERLENDİR</Text>
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
  tabPadding: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  tabTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.xl, letterSpacing: -1 },
  sectionTitle: { ...typography.bodySmall, fontWeight: '800', color: colors.text.muted, marginVertical: spacing.xl, letterSpacing: 1 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg },
  profileAvatar: { width: 70, height: 70, borderRadius: 35, marginRight: spacing.xl, borderWidth: 2, borderColor: colors.border },
  profileName: { color: colors.text.muted, ...typography.bodySmall },
  walletCard: { backgroundColor: colors.primary, padding: spacing.xl, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, ...shadows.md },
  topUpBtn: { backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.xl },
  expCard: { width: 220, backgroundColor: colors.background, marginRight: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  expImg: { width: '100%', height: 120, borderRadius: radius.sm, backgroundColor: colors.surface },
  expText: { color: colors.text.muted, ...typography.caption, marginTop: spacing.xs, lineHeight: 18 },
  logoutBtn: { backgroundColor: '#ffeeee', padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xxl, borderWidth: 1, borderColor: '#ffcccc' },
  ownerSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
});
