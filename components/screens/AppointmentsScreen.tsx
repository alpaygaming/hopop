import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface AppointmentsScreenProps {
  appointments: any[];
  onRefresh: () => void;
  onConfirm: (id: string) => void;
  onCancel: (item: any) => void;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  appointments,
  onRefresh,
  onConfirm,
  onCancel,
}) => {
  return (
    <View style={styles.tabPadding}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={styles.tabTitle}>AKTİF RANDEVULARIM</Text>
        <AnimatedPressable onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#000" />
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
                <Text style={{color:'#2ed573', fontWeight:'bold', marginRight:10, alignSelf:'center'}}>ONAYLI ✅</Text>
              )}
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: '#ff4757' }]} onPress={() => onCancel(item)}>
                <Text style={styles.actionBtnText}>İPTAL</Text>
              </AnimatedPressable>
            </View>
          </View>
        )} 
        ListEmptyComponent={<Text style={{ color: '#aaa', textAlign: 'center', marginTop: 50 }}>Aktif randevunuz bulunmuyor.</Text>} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabPadding: { flex: 1, padding: 20 },
  tabTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -1 },
  appCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  appShopName: { fontWeight: '900', fontSize: 16, color: '#000' },
  appDate: { color: '#666', fontSize: 13, marginTop: 5 },
  actionBtn: { backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginLeft: 10 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
