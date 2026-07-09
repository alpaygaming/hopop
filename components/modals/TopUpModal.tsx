import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';

export const TopUpModal: React.FC = () => {
  const {
    showTopUpModal, setShowTopUpModal, topUpAmount, setTopUpAmount,
    user, setUser, showNotification
  } = useApp();

  const handleTopUp = () => {
    if (!topUpAmount) return;
    const newBalance = (user?.balance || 0) + parseInt(topUpAmount);
    setUser({ ...user, balance: newBalance });
    setShowTopUpModal(false);
    setTopUpAmount('');
    showNotification(`${topUpAmount} TL yüklendi!`);
  };

  return (
    <Modal visible={showTopUpModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.paymentCard}>
          <Text style={styles.modalTitle}>Bakiye Yükle</Text>
          <TextInput
            style={styles.authInput}
            placeholderTextColor="#555"
            placeholder="Tutar (TL)"
            keyboardType="numeric"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
          />
          <AnimatedPressable style={styles.payBtn} onPress={handleTopUp}>
            <Text style={styles.payBtnText}>YÜKLE</Text>
          </AnimatedPressable>
          <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => setShowTopUpModal(false)}>
            <Text style={{color: '#aaa', fontWeight: 'bold'}}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  paymentCard: { backgroundColor: colors.background, padding: 30, borderRadius: radius.lg, ...shadows.md },
  modalTitle: { ...typography.h3, textAlign: 'center', marginBottom: 20 },
  authInput: { borderBottomWidth: 2, borderColor: colors.primary, padding: 10, marginBottom: 20, width: '100%', color: colors.text.primary },
  payBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  payBtnText: { color: colors.background, fontWeight: 'bold' },
});
