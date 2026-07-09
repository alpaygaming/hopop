import React from 'react';
import { View, Text, FlatList, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface ShopsScreenProps {
  dynamicBarbers: any[];
  sortOption: string;
  setSortOption: (opt: any) => void;
  setSelectedCategory: (cat: string) => void;
  setSelectedBarber: (barber: any) => void;
}

export const ShopsScreen: React.FC<ShopsScreenProps> = ({
  dynamicBarbers,
  sortOption,
  setSortOption,
  setSelectedCategory,
  setSelectedBarber,
}) => {
  return (
    <View style={styles.tabPadding}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={styles.tabTitle}>MAĞAZALAR</Text>
        {dynamicBarbers.length === 0 && (
          <AnimatedPressable onPress={() => setSelectedCategory('all')} style={{backgroundColor: '#000', padding: 8, borderRadius: 8}}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>DÜKKANLARI YÜKLE</Text>
          </AnimatedPressable>
        )}
      </View>
      
      <View style={{ marginBottom: 15, paddingBottom: 15, minHeight: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {[
            { id: 'nearest', label: 'En Yakın' }, 
            { id: 'farthest', label: 'En Uzak' }, 
            { id: 'highest_rating', label: 'En Yüksek' }, 
            { id: 'lowest_rating', label: 'En Düşük' }
          ].map(opt => (
            <AnimatedPressable 
              key={opt.id} 
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: sortOption === opt.id ? '#000' : '#eee' }} 
              onPress={() => setSortOption(opt.id as any)}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: sortOption === opt.id ? '#fff' : '#666' }}>{opt.label}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      <FlatList 
        data={[...dynamicBarbers]
          .sort((a, b) => {
            if (sortOption === 'nearest') return (a.distance || 0) - (b.distance || 0);
            if (sortOption === 'farthest') return (b.distance || 0) - (a.distance || 0);
            if (sortOption === 'highest_rating') return b.rating - a.rating;
            if (sortOption === 'lowest_rating') return a.rating - b.rating;
            return 0;
          })
          .sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0))} 
        keyExtractor={item => item.id} 
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.shopCard, item.isPromoted && styles.promotedCard]} onPress={() => setSelectedBarber(item)}>
            <Image source={{ uri: item.imageUrl }} style={styles.shopImage} />
            <View style={styles.shopInfo}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.shopName}>{item.name}</Text>
                {item.isPromoted && <View style={styles.promoBadge}><Text style={styles.promoText}>ÖNE ÇIKAN</Text></View>}
              </View>
              <Text style={styles.shopDistance}>
                {item.rating.toFixed(1)} ⭐ • {item.distance !== undefined ? (item.distance > 1000 ? (item.distance/1000).toFixed(1) + ' km' : item.distance + ' m') : 'Bilinmiyor'}
              </Text>
            </View>
          </TouchableOpacity>
        )} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabPadding: { flex: 1, padding: 20, backgroundColor: '#fff' },
  tabTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -1 },
  shopCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 15, padding: 12, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  promotedCard: { borderColor: '#ffd32a', borderWidth: 2, backgroundColor: '#fffdf0' },
  shopImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f9f9f9' },
  shopInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 5 },
  shopDistance: { color: '#666', fontSize: 13 },
  promoBadge: { backgroundColor: '#ffd32a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  promoText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
});
