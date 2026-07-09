import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import AdminMap from '@/components/AdminMap';

interface AdminPanelScreenProps {
  promoRequests: any[];
  handleApprovePromotion: (id: string) => void;
  deleteRequests: any[];
  approveDeleteRequest: (reviewId: string, shopId: string) => void;
  rejectDeleteRequest: (reviewId: string) => void;
  newShopLocation: any;
  setNewShopLocation: (loc: any) => void;
  systemShops: any[];
  newShopOwnerUsername: string;
  setNewShopOwnerUsername: (val: string) => void;
  newShopData: any;
  setNewShopData: (data: any) => void;
  newShopCategory: string;
  setNewShopCategory: (cat: string) => void;
  handleCreateShop: () => void;
  handleDeleteShop: (id: string) => void;
  setReviewTarget: (target: any) => void;
  setReviewData: (data: any) => void;
  setShowAddExperienceModal: (val: boolean) => void;
  globalReviews: any;
  deleteReviewDirectly: (reviewId: string, shopId: string) => void;
  onLogout: () => void;
}

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  promoRequests,
  handleApprovePromotion,
  deleteRequests,
  approveDeleteRequest,
  rejectDeleteRequest,
  newShopLocation,
  setNewShopLocation,
  systemShops,
  newShopOwnerUsername,
  setNewShopOwnerUsername,
  newShopData,
  setNewShopData,
  newShopCategory,
  setNewShopCategory,
  handleCreateShop,
  handleDeleteShop,
  setReviewTarget,
  setReviewData,
  setShowAddExperienceModal,
  globalReviews,
  deleteReviewDirectly,
  onLogout
}) => {
  return (
    <ScrollView style={styles.tabPadding} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>SİSTEM YÖNETİMİ</Text>
      
      <View style={styles.promoPanel}>
        <Text style={styles.panelTitle}>ÖNE ÇIKARMA İSTEKLERİ</Text>
        {promoRequests.length === 0 ? <Text style={{color:'#aaa'}}>Bekleyen istek yok.</Text> : promoRequests.map(req => (
          <View key={req.id} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', padding:10, borderRadius:8, marginBottom:10}}>
            <Text style={{color:'#fff', fontWeight:'bold'}}>{req.name}</Text>
            <AnimatedPressable style={{backgroundColor:'#2ed573', padding:8, borderRadius:5}} onPress={() => handleApprovePromotion(req.id)}>
              <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>ONAYLA</Text>
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
              <AnimatedPressable style={{backgroundColor:'#2ed573', padding:8, borderRadius:5, flex:1, alignItems:'center'}} onPress={() => approveDeleteRequest(req.reviewId, req.shopId)}>
                <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>ONAYLA (SİL)</Text>
              </AnimatedPressable>
              <AnimatedPressable style={{backgroundColor:'#ccc', padding:8, borderRadius:5, flex:1, alignItems:'center'}} onPress={() => rejectDeleteRequest(req.reviewId)}>
                <Text style={{color:'#333', fontSize:12, fontWeight:'bold'}}>REDDET</Text>
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
             <AnimatedPressable onPress={() => handleDeleteShop(shop.id)}><Ionicons name="trash" size={20} color="#ff4757" /></AnimatedPressable>
           </View>
           <AnimatedPressable style={{backgroundColor:'#3498db', padding:8, borderRadius:5, alignItems:'center', marginBottom: 10}} onPress={() => { setReviewTarget({id: '', shopId: shop.id, barberName: shop.name, date: '', time: '', price: 0, type: '', customerName: '', status: 'active'}); setReviewData({star: 5, comment: '', imageUrl: ''}); setShowAddExperienceModal(true); }}>
              <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>+ BU DÜKKANA YORUM EKLE</Text>
           </AnimatedPressable>
           {(globalReviews[shop.id] || []).length === 0 ? <Text style={{color:'#aaa', fontSize: 12}}>Yorum yok.</Text> : (globalReviews[shop.id] || []).map((r: any) => (
              <View key={r.id} style={{backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:8, borderWidth: 1, borderColor: '#eee'}}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={{fontWeight:'bold', fontSize: 12}}>{r.user} • {'⭐'.repeat(r.star)}</Text>
                  <AnimatedPressable onPress={() => deleteReviewDirectly(r.id, shop.id)}><Ionicons name="trash" size={16} color="#ff4757" /></AnimatedPressable>
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
  tabPadding: { flex: 1, padding: 20 },
  tabTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -1 },
  promoPanel: { backgroundColor: '#000', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:6, elevation:5 },
  panelTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#666', marginVertical: 20, letterSpacing: 1 },
  authInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, color: '#000' },
  authPrimaryBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  authPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#ffeeee', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, borderWidth: 1, borderColor: '#ffcccc' },
});
