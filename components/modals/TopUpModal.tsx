import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

interface TopUpModalProps {
  showTopUpModal: boolean;
  setShowTopUpModal: (val: boolean) => void;
  topUpAmount: string;
  setTopUpAmount: (val: string) => void;
  user: any;
  setUser: (user: any) => void;
  currentUsername: string | null;
  updateUserInDb: (username: string, data: any) => void;
  showNotification: (msg: string) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  showTopUpModal,
  setShowTopUpModal,
  topUpAmount,
  setTopUpAmount,
  user,
  setUser,
  currentUsername,
  updateUserInDb,
  showNotification
}) => {
  return (
    <Modal visible={showTopUpModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.paymentCard}>
          <Text style={styles.modalTitle}>BAKİYE YÜKLE</Text>
          <TextInput 
            style={styles.authInput} 
            placeholderTextColor="#555" 
            placeholder="Yüklenecek Tutar" 
            keyboardType="numeric" 
            value={topUpAmount} 
            onChangeText={setTopUpAmount} 
          />
          <View style={{flexDirection:'row', gap:10}}>
            <AnimatedPressable style={[styles.payBtn, {backgroundColor: '#ccc', flex:1}]} onPress={() => setShowTopUpModal(false)}>
              <Text style={styles.payBtnText}>İPTAL</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.payBtn, {flex: 1}]} onPress={() => { 
              const amt = parseFloat(topUpAmount) || 100; 
              const newB = user.balance + amt; 
              setUser({ ...user, balance: newB }); 
              if(currentUsername) updateUserInDb(currentUsername, { balance: newB }); 
              setShowTopUpModal(false); 
              setTopUpAmount(''); 
              showNotification(`${amt} TL Yüklendi!`); 
            }}>
              <Text style={styles.payBtnText}>YÜKLE</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: spacing.xl },
  paymentCard: { backgroundColor: colors.background, padding: spacing.xxl, borderRadius: radius.xl, ...shadows.md },
  modalTitle: { ...typography.h3, color: colors.primary, textAlign: 'center', marginBottom: spacing.xl },
  authInput: { borderBottomWidth: 2, borderColor: colors.primary, padding: spacing.md, marginBottom: spacing.xl, width: '100%', color: colors.primary, ...typography.body },
  payBtn: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', ...shadows.sm }, 
  payBtnText: { color: colors.background, ...typography.bodySmall },
});
