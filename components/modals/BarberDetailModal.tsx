import React from 'react';
import { View, Text, Modal, ScrollView, Image, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  monthNamesShort: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
  dayNames: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
  dayNamesShort: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

import { useApp } from '@/contexts/AppContext';

export const BarberDetailModal: React.FC = () => {
  const {
    selectedBarber, setSelectedBarber, userRole,
    showNotification, globalReviews
  } = useApp();

  const [modalImageIndex, setModalImageIndex] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

  const handlePayment = () => {};

  if (!selectedBarber) return null;

  return (
    <Modal visible={!!selectedBarber} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#fff' }} onLayout={(e) => {
         if(!selectedBarber.modalWidth) setSelectedBarber({...selectedBarber, modalWidth: e.nativeEvent.layout.width});
      }}>
        <View style={{ height: 250, position: 'relative' }}>
          <Image source={{ uri: selectedBarber.image_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=2074&q=80' }} style={{ width: selectedBarber.modalWidth || Dimensions.get('window').width, height: 250, resizeMode: 'cover', backgroundColor: '#000' }} />
          
          <AnimatedPressable style={styles.closeBtn} onPress={() => { setSelectedBarber(null); setModalImageIndex(0); }}>
            <Ionicons name="close" size={24} color="white" />
          </AnimatedPressable>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={styles.detailName}>{selectedBarber.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={[styles.categoryBadge, { backgroundColor: selectedBarber.type === 'berber' ? '#3498db' : selectedBarber.type === 'kuaför' ? '#e84393' : selectedBarber.type === 'tırnak' ? '#fd79a8' : '#a29bfe' }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{selectedBarber.type === 'berber' ? 'BERBER' : selectedBarber.type === 'kuaför' ? 'KUAFÖR' : selectedBarber.type === 'tırnak' ? 'NAIL ART' : 'GÜZELLİK'}</Text>
            </View>
            <Text style={{ marginLeft: 10, fontSize: 15, color: '#f39c12' }}>⭐ {selectedBarber.rating.toFixed(1)}</Text>
          </View>

          {selectedBarber.address ? <View style={styles.detailRow}><Ionicons name="location" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.address}</Text></View> : null}
          {selectedBarber.phone ? <View style={styles.detailRow}><Ionicons name="call" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.phone}</Text></View> : null}
          {selectedBarber.openingHours ? <View style={styles.detailRow}><Ionicons name="time" size={18} color="#666" /><Text style={styles.detailRowText}>{selectedBarber.openingHours}</Text></View> : null}
          {selectedBarber.website ? <View style={styles.detailRow}><Ionicons name="globe" size={18} color="#666" /><Text style={[styles.detailRowText, { color: '#3498db' }]} numberOfLines={1}>{selectedBarber.website}</Text></View> : null}
          {selectedBarber.description ? <Text style={{ color: '#555', fontSize: 13, marginTop: 10, lineHeight: 20 }}>{selectedBarber.description}</Text> : null}

          <Text style={styles.sectionTitle}>GÜN SEÇİN</Text>
          <Calendar
            current={new Date().toISOString().split('T')[0]}
            minDate={new Date().toISOString().split('T')[0]}
            onDayPress={(day: any) => {
              setSelectedDate(day.dateString);
              setSelectedTime(null);
            }}
            markedDates={{
              [selectedDate || '']: { selected: true, selectedColor: colors.primary, selectedTextColor: colors.background }
            }}
            theme={{
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontWeight: 'bold',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold'
            }}
            style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl }}
          />

          {selectedDate && (
            <>
              <Text style={styles.sectionTitle}>SAAT SEÇİN (350 TL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
                {(selectedBarber.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"]).map((t: string) => (
                  <AnimatedPressable key={t} style={[styles.slot, selectedTime === t && styles.selected]} onPress={() => setSelectedTime(t)}>
                    <Text style={[styles.slotText, selectedTime === t && { color: '#fff' }]}>{t}</Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </>
          )}

          <AnimatedPressable style={[styles.payBtn, { marginBottom: 20 }]} onPress={() => {
            if (userRole === 'customer') {
              if (!selectedDate || !selectedTime) {
                 showNotification("Lütfen gün ve saat seçin.");
                 return;
              }
              handlePayment();
            } else {
              showNotification("Sadece müşteriler randevu alabilir.");
            }
          }}>
            <Text style={styles.payBtnText}>RANDEVU AL VE ÖDEMEYE GEÇ (₺350)</Text>
          </AnimatedPressable>

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>MÜŞTERİ DENEYİMLERİ</Text>
          {(globalReviews[selectedBarber.id] || []).length === 0 ? <Text style={{color: colors.text.muted, marginBottom: spacing.xl, ...typography.body}}>Henüz değerlendirme yok.</Text> : (
            <View style={{ marginBottom: spacing.xl }}>
              {(globalReviews[selectedBarber.id] || []).map((r: any) => (
                <View key={r.id} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md, ...shadows.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    <Image source={{ uri: r.userAvatar || 'https://i.pravatar.cc/150' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: spacing.sm }} />
                    <View>
                      <Text style={{ ...typography.bodySmall }}>{r.user}</Text>
                      <Text style={{ color: colors.text.muted, ...typography.caption }}>{r.date}</Text>
                    </View>
                    <Text style={{ marginLeft: 'auto', color: colors.accent.yellow }}>{'⭐'.repeat(r.star)}</Text>
                  </View>
                  <Text style={{ color: colors.text.primary, ...typography.body }}>{r.comment}</Text>
                  {r.imageUrl && <Image source={{uri: r.imageUrl}} style={{width: '100%', height: 200, resizeMode: 'contain', borderRadius: radius.md, marginTop: spacing.md}} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 24, padding: 10, ...shadows.md },
  detailName: { ...typography.h1, color: colors.primary, marginBottom: spacing.xl }, 
  sectionTitle: { ...typography.caption, color: colors.text.muted, marginVertical: spacing.lg, letterSpacing: 1 },
  categoryBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  detailRowText: { marginLeft: spacing.md, ...typography.body, color: colors.text.primary, flex: 1 },
  slot: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginRight: spacing.md, minWidth: 80, alignItems: 'center', backgroundColor: colors.background, ...shadows.sm },
  selected: { backgroundColor: colors.primary }, 
  slotText: { ...typography.bodySmall },
  payBtn: { backgroundColor: colors.primary, padding: spacing.xl, borderRadius: radius.lg, marginTop: spacing.xxl, alignItems: 'center', ...shadows.md }, 
  payBtnText: { color: colors.background, ...typography.bodySmall },
});
