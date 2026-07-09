import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import AdminMap from '@/components/AdminMap';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

import { useApp } from '@/contexts/AppContext';

export const AdminPanelScreen: React.FC = () => {
  const {
    promoRequests, handleApprovePromotion, deleteRequests,
    approveDeleteRequest, rejectDeleteRequest, newShopLocation,
    setNewShopLocation, systemShops, newShopOwnerUsername,
    setNewShopOwnerUsername, newShopData, setNewShopData,
    setReviewTarget, setReviewData, setShowAddExperienceModal,
    globalReviews, setUserRole
  } = useApp();

  const [newShopCategory, setNewShopCategory] = React.useState('berber');
  const onLogout = () => setUserRole(null);
  const handleCreateShop = async () => {};
  const handleDeleteShop = async () => {};
  const deleteReviewDirectly = async () => {};
  return (
    <ScrollView style={styles.tabPadding} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>SİSTEM YÖNETİMİ</Text>
      
      <View style={styles.promoPanel}>
        <Text style={styles.panelTitle}>ÖNE ÇIKARMA İSTEKLERİ</Text>
        {promoRequests.length === 0 ? <Text style={{color:'#aaa'}}>Bekleyen istek yok.</Text> : promoRequests.map(req => (
          <View key={req.id} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:8, marginBottom:10}}>
            <Text style={{color:'#fff', fontWeight:'bold'}}>{req.name}</Text>
            <AnimatedPressable style={[styles.actionBtn, { backgroundColor: colors.accent.green }]} onPress={() => handleApprovePromotion(req.id)}>
              <Text style={styles.actionBtnText}>ONAYLA</Text>
            </AnimatedPressable>
          </View>
        ))}
      </View>

      <View style={[styles.promoPanel, { backgroundColor: '#ff4757' }]}>
        <Text style={styles.panelTitle}>YORUM SİLME İSTEKLERİ</Text>
        {deleteRequests.length === 0 ? <Text style={{color:'#fff', opacity: 0.8}}>Bekleyen silme isteği yok.</Text> : deleteRequests.map(req => (
          <View key={req.reviewId} style={{backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:8, marginBottom:10}}>
            <Text style={{color:'#fff', fontWeight:'bold', marginBottom: 5}}>{req.shopName}</Text>
            <Text style={{color:'#fff', opacity:0.8, fontSize:12, marginBottom: 10}}>{req.comment}</Text>
            <View style={{flexDirection:'row', gap: 10}}>
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: colors.accent.red }]} onPress={() => approveDeleteRequest(req.reviewId, req.shopId)}>
                <Text style={styles.actionBtnText}>SİLİNMEYİ ONAYLA</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: colors.accent.yellow }]} onPress={() => rejectDeleteRequest(req.reviewId)}>
                <Text style={styles.actionBtnText}>REDDET</Text>
              </AnimatedPressable>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>YENİ DÜKKAN EKLE</Text>
      <View style={{ height: 350, borderRadius: 15, overflow: 'hidden', marginBottom: 15 }}>
        <AdminMap style={{ flex: 1 }} selectedLocation={newShopLocation} onMapPress={(e: any) => setNewShopLocation(e.nativeEvent.coordinate)} systemShops={systemShops} />
      </View>
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="İşletmecinin Kullanıcı Adı (Örn: emre123)" value={newShopOwnerUsername} onChangeText={setNewShopOwnerUsername} autoCapitalize="none" />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Dükkan Adı" value={newShopData.name} onChangeText={(t) => setNewShopData({...newShopData, name: t})} />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Kategori (berber, kuaför, tırnak, güzellik)" value={newShopCategory} onChangeText={setNewShopCategory} autoCapitalize="none" />
      <TextInput style={[styles.authInput, { height: 60 }]} placeholderTextColor="#555" placeholder="Hizmet Açıklaması" value={newShopData.description} onChangeText={(t) => setNewShopData({...newShopData, description: t})} multiline />
      <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Açık Adres" value={newShopData.address} onChangeText={(t) => setNewShopData({...newShopData, address: t})} />
      <AnimatedPressable style={styles.authPrimaryBtn} onPress={handleCreateShop}>
        <Text style={styles.authPrimaryBtnText}>DÜKKANI SİSTEME EKLE</Text>
      </AnimatedPressable>

      <Text style={[styles.sectionTitle, {marginTop: 30}]}>SİSTEMDEKİ DÜKKANLAR VE YORUMLARI</Text>
      {systemShops.map(shop => (
         <View key={shop.id} style={{padding:15, backgroundColor:'#f9f9f9', borderRadius:10, marginBottom:10}}>
           <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
             <Text style={{fontWeight:'bold', fontSize:16}}>{shop.name}</Text>
             <AnimatedPressable onPress={handleDeleteShop}><Ionicons name="trash" size={20} color="#ff4757" /></AnimatedPressable>
           </View>
           <AnimatedPressable style={{backgroundColor:'#3498db', padding:8, borderRadius:5, alignItems:'center', marginBottom: 10}} onPress={() => { setReviewTarget({id: '', shopId: shop.id, barberName: shop.name, date: '', time: '', price: 0, type: '', customerName: '', status: 'active'}); setReviewData({star: 5, comment: '', imageUrl: ''}); setShowAddExperienceModal(true); }}>
              <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>+ BU DÜKKANA YORUM EKLE</Text>
           </AnimatedPressable>
           {(globalReviews[shop.id] || []).length === 0 ? <Text style={{color:'#aaa', fontSize: 12}}>Yorum yok.</Text> : (globalReviews[shop.id] || []).map((r: any) => (
              <View key={r.id} style={{backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:8, borderWidth: 1, borderColor: '#eee'}}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={{fontWeight:'bold', fontSize: 12}}>{r.user} • {'⭐'.repeat(r.star)}</Text>
                  <AnimatedPressable onPress={deleteReviewDirectly}><Ionicons name="trash" size={16} color="#ff4757" /></AnimatedPressable>
                </View>
                <Text style={{color:'#666', fontSize: 11, marginTop: 4}}>{r.comment}</Text>
              </View>
           ))}
         </View>
      ))}
      
      <AnimatedPressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={{ color: 'red', fontWeight:'bold', marginBottom:40 }}>Çıkış Yap</Text>
      </AnimatedPressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabPadding: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  tabTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.xl, letterSpacing: -1 },
  promoPanel: { backgroundColor: colors.primary, padding: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.xl, ...shadows.md },
  panelTitle: { color: colors.background, fontWeight: 'bold', ...typography.body, marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodySmall, color: colors.text.muted, marginVertical: spacing.xl, letterSpacing: 1 },
  authInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.lg, ...typography.body, color: colors.primary },
  authPrimaryBtn: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm, ...shadows.sm },
  authPrimaryBtnText: { color: colors.background, ...typography.body },
  authSecondaryBtnText: { color: colors.primary, ...typography.body, fontWeight: 'bold' },
  actionBtn: { padding: spacing.md, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: colors.background, ...typography.caption, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#ffeeee', padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xxl, borderWidth: 1, borderColor: '#ffcccc' },
});
