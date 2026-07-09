import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface OwnerPanelScreenProps {
  ownerShopDb: any;
  ownerShop: any;
  user: any;
  localImages: string[];
  setLocalImages: (imgs: string[] | ((prev: string[]) => string[])) => void;
  pickImage: (callback: (uri: string) => void, aspect: [number, number]) => void;
  setOwnerShopDb: (data: any) => void;
  showNotification: (msg: string) => void;
  handleRequestPromotion: () => void;
  ownerAppointments: any[];
  setOwnerAppointments: (apps: any[]) => void;
  setShowManualAddModal: (val: boolean) => void;
  globalReviews: any;
  deleteRequests: any[];
  handleDeleteRequest: (reviewId: string, shopId: string, shopName: string, comment: string) => void;
  onLogout: () => void;
}

export const OwnerPanelScreen: React.FC<OwnerPanelScreenProps> = ({
  ownerShopDb,
  ownerShop,
  user,
  localImages,
  setLocalImages,
  pickImage,
  setOwnerShopDb,
  showNotification,
  handleRequestPromotion,
  ownerAppointments,
  setOwnerAppointments,
  setShowManualAddModal,
  globalReviews,
  deleteRequests,
  handleDeleteRequest,
  onLogout
}) => {

  const refreshAppointments = async () => {
    const { data: oApps } = await supabase.from('appointments').select('*, profiles(full_name)').eq('shop_id', ownerShopDb.id).order('created_at', { ascending: false });
    const mappedDb = (oApps || []).map((a: any) => ({
      id: a.id, shopId: a.shop_id, barberName: ownerShopDb.name,
      customerName: a.profiles?.full_name || 'Müşteri',
      date: new Date(a.appointment_date).toLocaleDateString(),
      time: new Date(a.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      price: a.price, type: ownerShopDb.category, status: a.status
    }));
    
    let manualApps = [];
    try {
      const mData = await AsyncStorage.getItem('hopop_manual_apps_' + ownerShopDb.id);
      if (mData) manualApps = JSON.parse(mData);
    } catch(e) {}
    
    setOwnerAppointments([...mappedDb, ...manualApps]);
    showNotification("Randevular yenilendi!");
  };

  const saveImages = async () => {
    const { error } = await supabase.from('shops').update({ image_url: JSON.stringify(localImages) }).eq('id', ownerShopDb.id);
    if (!error) { 
      setOwnerShopDb({...ownerShopDb, image_url: JSON.stringify(localImages)}); 
      showNotification("Vitrin fotoğrafları kaydedildi! ✅"); 
    } else {
      showNotification("Hata: " + error.message);
    }
  };

  const toggleWorkingHour = async (t: string, isActive: boolean) => {
    const currentHours = ownerShopDb.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"];
    const newHours = isActive ? currentHours.filter((h:string) => h !== t) : [...currentHours, t].sort();
    const { error } = await supabase.from('shops').update({ working_hours: newHours }).eq('id', ownerShopDb.id);
    if (!error) { setOwnerShopDb({...ownerShopDb, working_hours: newHours}); showNotification("Saatler kaydedildi."); }
  };

  if (!ownerShopDb) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="time" size={60} color="#ccc" />
        <Text style={[styles.tabTitle, { marginTop: 20, textAlign: 'center' }]}>ONAY BEKLENİYOR</Text>
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 }}>
          İşletme hesabınız oluşturuldu. Sistem yöneticisi dükkanınızı haritaya ekleyip size atadığında bu panel aktif olacaktır.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Hesaptan Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ownerReviews = Object.values(globalReviews).flat().filter((r: any) => r.shopId === ownerShopDb.id || r.shopName === ownerShopDb.name) as any[];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={styles.ownerTopHeader}>
        <View><Text style={styles.ownerShopName}>{ownerShop.name}</Text><Text style={{ color: '#aaa' }}>Kategori: {ownerShopDb.category?.toUpperCase()}</Text></View>
        <View style={{flexDirection: 'row', gap: 10}}>
          <View style={styles.viewBadge}><Ionicons name="eye" size={14} color="#7d5fff" /><Text style={styles.viewText}>{ownerShop.views}</Text></View>
          <View style={styles.viewBadge}><Ionicons name="wallet" size={14} color="#2ed573" /><Text style={styles.viewText}>{user.balance} TL</Text></View>
        </View>
      </View>

      <View style={styles.promoPanel}>
        <Text style={styles.panelTitle}>Sponsorlu Öne Çıkarma</Text>
        {ownerShopDb.promotion_status === 'approved' ? (
          <View>
            <Text style={styles.timerText}>Dükkanınız Öne Çıkarıldı!</Text>
          </View>
        ) : ownerShopDb.promotion_status === 'pending' ? (
          <View>
            <Text style={styles.timerText}>İsteğiniz İnceleniyor...</Text>
            <Text style={{color:'#fff', textAlign:'center', fontSize:12}}>Admin onayı bekleniyor.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.promoDesc}>Listede en üstte gözükmek için onay isteği gönderin.</Text>
            <AnimatedPressable style={styles.startBtn} onPress={handleRequestPromotion}>
              <Text style={styles.startBtnText}>ÖNE ÇIKARMA İSTE (100 TL)</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>

      <View style={styles.ownerSectionHead}>
        <Text style={styles.sectionTitle}>MAĞAZA VİTRİNİ</Text>
      </View>
      <View style={{ backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, marginBottom: 25 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {localImages.map((img, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image source={{uri: img}} style={{ width: 120, height: 120, borderRadius: 12, marginRight: 10, resizeMode: 'cover' }} />
              <AnimatedPressable style={{ position: 'absolute', top: 5, right: 15, backgroundColor: 'rgba(255,0,0,0.8)', padding: 5, borderRadius: 15, zIndex: 10 }} onPress={() => {
                setLocalImages(localImages.filter((_, idx) => idx !== i));
              }}>
                <Ionicons name="trash" size={16} color="#fff" />
              </AnimatedPressable>
            </View>
          ))}
          <AnimatedPressable style={[styles.expPickerPlaceholder, {width: 120, height: 120, marginRight: 10, marginBottom: 0}]} onPress={() => pickImage((uri) => {
             setLocalImages(prev => [...prev, uri]);
          }, [16, 9])}>
            <Ionicons name="add" size={40} color="#ccc" />
            <Text style={{color:'#aaa', fontSize:12, marginTop:8, textAlign:'center'}}>Fotoğraf Ekle</Text>
          </AnimatedPressable>
        </ScrollView>
        <AnimatedPressable style={[styles.payBtn, { marginBottom: 20 }]} onPress={saveImages}>
          <Text style={styles.payBtnText}>FOTOĞRAFLARI KAYDET</Text>
        </AnimatedPressable>

        <Text style={{ fontWeight:'bold', marginBottom:10 }}>Çalışma Saatleri (Müşterilerin Seçebileceği Saatler)</Text>
        <View style={{flexDirection:'row', flexWrap:'wrap', gap:10}}>
           {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(t => {
              const isActive = (ownerShopDb.working_hours || ["09:00", "11:00", "13:00", "15:00", "17:00"]).includes(t);
              return (
                <AnimatedPressable key={t} style={[styles.slot, isActive && styles.selected, {minWidth:70, padding:10, marginBottom: 5}]} onPress={() => toggleWorkingHour(t, isActive)}>
                  <Text style={[styles.slotText, isActive && { color: '#fff' }]}>{t}</Text>
                </AnimatedPressable>
              )
           })}
        </View>
      </View>

      <View style={styles.ownerSectionHead}>
        <Text style={styles.sectionTitle}>GELEN RANDEVULAR</Text>
        <View style={{flexDirection:'row', gap:10, alignItems: 'center'}}>
          <AnimatedPressable onPress={refreshAppointments}>
            <Ionicons name="refresh" size={20} color="#000" />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => setShowManualAddModal(true)}><Text style={styles.addManualText}>+ ELLE EKLE</Text></AnimatedPressable>
        </View>
      </View>
      
      {ownerAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length === 0 ? (
         <Text style={{ color: '#aaa', textAlign: 'center', marginVertical: 20 }}>Randevu yok.</Text>
      ) : (
         ownerAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').map(item => (
          <View key={item.id} style={styles.ownerAppCard}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>{item.customerName}</Text>
              <Text style={{ color: '#aaa', fontSize: 12 }}>{item.date} • {item.time}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
               {item.status === 'confirmed' ? <Ionicons name="checkmark-circle" size={24} color="#2ed573" /> : <Text style={{color:'#f39c12', fontWeight:'bold', fontSize:12}}>BEKLİYOR (Ödendi)</Text>}
            </View>
          </View>
         ))
      )}
      
      <View style={[styles.ownerSectionHead, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>MAĞAZA YORUMLARI</Text>
      </View>
      {ownerReviews.length === 0 ? (
        <Text style={{color:'#aaa', marginBottom: 20}}>Henüz mağazanıza yapılmış bir değerlendirme bulunmuyor.</Text>
      ) : (
        <View style={{ marginBottom: 20 }}>
          {ownerReviews.map(r => {
            const isDeleteRequested = deleteRequests.some(req => req.reviewId === r.id);
          return (
            <View key={r.id} style={{ backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Image source={{ uri: r.userAvatar || 'https://i.pravatar.cc/150' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                <View>
                  <Text style={{ fontWeight: 'bold' }}>{r.user}</Text>
                  <Text style={{ color: '#aaa', fontSize: 10 }}>{r.date}</Text>
                </View>
                <Text style={{ marginLeft: 'auto', color: '#f39c12' }}>{'⭐'.repeat(r.star)}</Text>
              </View>
              <Text style={{ color: '#333', marginBottom: 10 }}>{r.comment}</Text>
              {r.imageUrl && <Image source={{uri: r.imageUrl}} style={{width: '100%', height: 200, resizeMode: 'contain', borderRadius: 10, marginBottom: 10}} />}
              <TouchableOpacity 
                style={{ backgroundColor: isDeleteRequested ? '#ccc' : '#ff4757', padding: 10, borderRadius: 8, alignItems: 'center' }} 
                disabled={isDeleteRequested}
                onPress={() => handleDeleteRequest(r.id, ownerShopDb.id, ownerShopDb.name, r.comment)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isDeleteRequested ? "SİLME İSTEĞİ GÖNDERİLDİ" : "YORUMU SİL (ONAYA GÖNDER)"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      )}
      
      <AnimatedPressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={{ color: 'red', fontWeight:'bold', marginBottom:40 }}>Panelden Çıkış</Text>
      </AnimatedPressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -1 },
  logoutBtn: { backgroundColor: '#ffeeee', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, borderWidth: 1, borderColor: '#ffcccc' },
  ownerTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15 },
  ownerShopName: { fontSize: 20, fontWeight: '900' },
  viewBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 10, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:3, elevation:2 },
  viewText: { marginLeft: 5, fontWeight: 'bold', fontSize: 12 },
  promoPanel: { backgroundColor: '#000', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:6, elevation:5 },
  panelTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  timerText: { color: '#ffd32a', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginVertical: 10 },
  promoDesc: { color: '#aaa', fontSize: 12, marginBottom: 15 },
  startBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center' },
  startBtnText: { fontWeight: 'bold', color: '#000', fontSize: 12 },
  ownerSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#666', marginVertical: 20, letterSpacing: 1 },
  expPickerPlaceholder: { height: 100, backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  payBtn: { backgroundColor: '#000', padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.2, shadowRadius:5, elevation:5 },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  slot: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center' },
  selected: { backgroundColor: '#000' },
  slotText: { fontWeight: 'bold', fontSize: 12 },
  addManualText: { color: '#7d5fff', fontWeight: 'bold', fontSize: 12 },
  ownerAppCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius:3, elevation:2 },
});
