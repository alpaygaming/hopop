import React from 'react';
import { View, Text, FlatList, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';

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
  tabPadding: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  tabTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.xl, letterSpacing: -1 },
  shopCard: { 
    flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.lg, 
    marginBottom: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, 
    ...shadows.sm 
  },
  promotedCard: { borderColor: colors.accent.yellow, borderWidth: 2, backgroundColor: '#fffdf0' },
  shopImage: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.surface },
  shopInfo: { flex: 1, marginLeft: spacing.lg, justifyContent: 'center' },
  shopName: { ...typography.body, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.xs },
  shopDistance: { color: colors.text.muted, ...typography.caption },
  promoBadge: { backgroundColor: colors.accent.yellow, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs, alignSelf: 'flex-start' },
  promoText: { ...typography.label, color: colors.primary },
});
