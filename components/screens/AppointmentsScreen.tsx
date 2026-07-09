import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const AppointmentsScreen: React.FC = () => {
  const { appointments, setAppointments, user, setUser, showNotification } = useApp();

  const onRefresh = () => showNotification("Randevular güncel!");
  const onConfirm = (id: string) => {}; 
  const onCancel = async (item: any) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', item.id);
    if (error) { Alert.alert("Hata", error.message); return; }
    
    const newApps = appointments.filter(a => a.id !== item.id);
    setAppointments(newApps); 
    setUser({ ...user, balance: user.balance + 350 }); 
    showNotification("Randevu iptal edildi. 350 TL iade edildi.");
  };
  return (
    <View style={styles.tabPadding}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl}}>
        <Text style={styles.tabTitle}>AKTİF RANDEVULARIM</Text>
        <AnimatedPressable onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </AnimatedPressable>
      </View>
      <FlatList 
        data={appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')} 
        keyExtractor={item => item.id} 
        renderItem={({ item }) => (
          <View style={styles.appCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appShopName}>{item.barberName}</Text>
              <Text style={styles.appDate}>{item.date} | {item.time}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {item.status === 'pending' && (
                <AnimatedPressable style={styles.actionBtn} onPress={() => onConfirm(item.id)}>
                  <Text style={styles.actionBtnText}>GİDECEĞİM</Text>
                </AnimatedPressable>
              )}
              {item.status === 'confirmed' && (
                <Text style={{color: colors.accent.green, fontWeight:'bold', marginRight: spacing.md, alignSelf:'center'}}>ONAYLI ✅</Text>
              )}
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: colors.accent.red }]} onPress={() => onCancel(item)}>
                <Text style={styles.actionBtnText}>İPTAL</Text>
              </AnimatedPressable>
            </View>
          </View>
        )} 
        ListEmptyComponent={<Text style={{ color: colors.text.muted, textAlign: 'center', marginTop: spacing.xxl, ...typography.body }}>Aktif randevunuz bulunmuyor.</Text>} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabPadding: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  tabTitle: { ...typography.h2, color: colors.primary, letterSpacing: -1 },
  appCard: { 
    backgroundColor: colors.background, padding: spacing.xl, borderRadius: radius.lg, 
    marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    borderWidth: 1, borderColor: colors.border, ...shadows.sm 
  },
  appShopName: { ...typography.h3, color: colors.primary },
  appDate: { color: colors.text.muted, ...typography.bodySmall, marginTop: spacing.xs },
  actionBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, marginLeft: spacing.sm },
  actionBtnText: { color: colors.background, ...typography.label },
});
