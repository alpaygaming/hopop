import React from 'react';
import { View, Text, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Appointment } from '@/types';

interface ManualAddModalProps {
  showManualAddModal: boolean;
  setShowManualAddModal: (val: boolean) => void;
  manualCustName: string;
  setManualCustName: (val: string) => void;
  manualTime: string;
  setManualTime: (val: string) => void;
  ownerShopDb: any;
  ownerAppointments: Appointment[];
  setOwnerAppointments: (apps: Appointment[]) => void;
  showNotification: (msg: string) => void;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  showManualAddModal,
  setShowManualAddModal,
  manualCustName,
  setManualCustName,
  manualTime,
  setManualTime,
  ownerShopDb,
  ownerAppointments,
  setOwnerAppointments,
  showNotification
}) => {
  return (
    <Modal visible={showManualAddModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.paymentCard}>
          <Text style={styles.modalTitle}>MANUEL RANDEVU</Text>
          <TextInput 
            style={styles.authInput} 
            placeholderTextColor="#555" 
            placeholder="Müşteri Adı" 
            value={manualCustName} 
            onChangeText={setManualCustName} 
          />
          <TextInput 
            style={styles.authInput} 
            placeholderTextColor="#555" 
            placeholder="Saat (Örn: 10:30)" 
            value={manualTime} 
            onChangeText={setManualTime} 
          />
          <View style={{flexDirection:'row', gap:10}}>
            <AnimatedPressable style={[styles.payBtn, {backgroundColor: '#ccc', flex:1}]} onPress={() => setShowManualAddModal(false)}>
              <Text style={styles.payBtnText}>İPTAL</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.payBtn, {flex:1}]} onPress={async () => { 
              if (!manualCustName.trim() || !manualTime.trim()) { 
                Alert.alert("Hata", "Lütfen isim ve saat girin."); 
                return; 
              }
              const newApp: Appointment = { 
                id: 'm_' + Math.random().toString(), 
                shopId: ownerShopDb?.id || 'osm-1', 
                barberName: '', 
                date: 'Bugün', 
                time: manualTime, 
                price: 0, 
                type: '', 
                customerName: manualCustName + ' (Elle)', 
                status: 'confirmed' 
              };
              const updatedApps = [newApp, ...ownerAppointments];
              setOwnerAppointments(updatedApps);
              try {
                const mData = await AsyncStorage.getItem('hopop_manual_apps_' + ownerShopDb?.id);
                const manualApps = mData ? JSON.parse(mData) : [];
                await AsyncStorage.setItem('hopop_manual_apps_' + ownerShopDb?.id, JSON.stringify([newApp, ...manualApps]));
              } catch(e) {}
              setShowManualAddModal(false); 
              setManualCustName('');
              setManualTime('');
              showNotification("Manuel randevu eklendi.");
            }}>
              <Text style={styles.payBtnText}>KAYDET</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
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
});
