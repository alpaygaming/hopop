import React from 'react';
import { View, Text, Modal, TextInput, KeyboardAvoidingView, Platform, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Review } from '@/types';

interface AddExperienceModalProps {
  showAddExperienceModal: boolean;
  setShowAddExperienceModal: (val: boolean) => void;
  reviewTarget: any;
  authError: string;
  setAuthError: (val: string) => void;
  reviewData: any;
  setReviewData: (val: any) => void;
  pickImage: (callback: (uri: string) => void) => void;
  user: any;
  globalReviews: any;
  setGlobalReviews: (val: any) => void;
  userExperiences: any[];
  setUserExperiences: (val: any[]) => void;
  updateAverageRating: (shopId: string, reviews: any[]) => void;
  showNotification: (msg: string) => void;
}

export const AddExperienceModal: React.FC<AddExperienceModalProps> = ({
  showAddExperienceModal,
  setShowAddExperienceModal,
  reviewTarget,
  authError,
  setAuthError,
  reviewData,
  setReviewData,
  pickImage,
  user,
  globalReviews,
  setGlobalReviews,
  userExperiences,
  setUserExperiences,
  updateAverageRating,
  showNotification
}) => {
  return (
    <Modal visible={showAddExperienceModal} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.paymentCard}>
          <Text style={styles.modalTitle}>DENEYİM DEĞERLENDİR</Text>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 15}}>{reviewTarget?.barberName}</Text>
            {authError ? <Text style={{color: 'red', textAlign: 'center', marginBottom: 10}}>{authError}</Text> : null}
            
            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 20}}>
              {[1,2,3,4,5].map(s => (
                <AnimatedPressable key={s} onPress={() => setReviewData({...reviewData, star: s})}>
                  <Text style={{fontSize: 30, color: s <= reviewData.star ? '#f39c12' : '#ccc', marginHorizontal: 5}}>★</Text>
                </AnimatedPressable>
              ))}
            </View>

            <AnimatedPressable style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}} onPress={() => pickImage((uri: string) => setReviewData({...reviewData, imageUrl: uri}))}>
              {reviewData.imageUrl ? 
                <Image source={{ uri: reviewData.imageUrl }} style={{width: 80, height: 80, borderRadius: 12, marginRight: 15, backgroundColor: '#eee'}} />
                : <View style={{width: 80, height: 80, borderRadius: 12, marginRight: 15, backgroundColor: '#eee', justifyContent:'center', alignItems:'center'}}><Ionicons name="camera" size={30} color="#ccc"/></View>
              }
              <View><Text style={{fontWeight: 'bold', color: '#7d5fff'}}>Fotoğraf Ekle (İsteğe Bağlı)</Text></View>
            </AnimatedPressable>
            
            <TextInput style={styles.authInput} placeholderTextColor="#555" placeholder="Yorumunuz (İsteğe Bağlı)" value={reviewData.comment} onChangeText={(t) => setReviewData({...reviewData, comment: t})} multiline />
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable style={[styles.payBtn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setShowAddExperienceModal(false)}>
                <Text style={styles.payBtnText}>İPTAL</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.payBtn, { flex: 1 }]} onPress={async () => { 
                if(reviewTarget) {
                  const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                  const apptId = isValidUuid(reviewTarget.id) ? reviewTarget.id : null;
                  const shopId = isValidUuid(reviewTarget.shopId) ? reviewTarget.shopId : null;

                  if (!shopId) {
                    setAuthError("Bu dükkan veritabanında gerçek bir kimliğe sahip değil (Eski/Mock dükkan). Yorum yapılamaz.");
                    return;
                  }

                  const { data: newDbRev, error } = await supabase.from('reviews').insert({
                    shop_id: shopId,
                    user_id: user.id,
                    appointment_id: apptId,
                    comment: reviewData.comment || 'Puanlandı.',
                    star: reviewData.star,
                    image_url: reviewData.imageUrl
                  }).select('*, profiles(full_name, avatar_url), shops(name)').single();

                  if (!error && newDbRev) {
                    const rev: Review = {
                      id: newDbRev.id,
                      user: newDbRev.profiles?.full_name || user.name,
                      userAvatar: newDbRev.profiles?.avatar_url || user.avatar,
                      shopId: newDbRev.shop_id,
                      shopName: newDbRev.shops?.name || reviewTarget.barberName,
                      appointmentId: newDbRev.appointment_id,
                      comment: newDbRev.comment,
                      star: newDbRev.star,
                      imageUrl: newDbRev.image_url,
                      date: new Date(newDbRev.created_at).toLocaleDateString()
                    };
                    
                    const shopReviews = [...(globalReviews[rev.shopId] || []), rev];
                    const newGlobalReviews = {...globalReviews, [rev.shopId]: shopReviews};
                    const newExps = [rev, ...userExperiences];
                    
                    setGlobalReviews(newGlobalReviews);
                    setUserExperiences(newExps);
                    updateAverageRating(rev.shopId, shopReviews);
                    setAuthError('');
                  } else {
                    setAuthError("Yorum kaydedilemedi: " + (error?.message || 'Veritabanı hatası. SQL tablosunu oluşturduğunuzdan emin olun!'));
                    return;
                  }
                }
                setShowAddExperienceModal(false); 
                showNotification("Değerlendirme kaydedildi! 🎉"); 
                setAuthError('');
              }}>
                <Text style={styles.payBtnText}>GÖNDER</Text>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
