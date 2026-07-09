import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import AppMap from '@/components/AppMap';

const CATEGORIES_DATA = [
  { id: 'berber', name: 'Erkek Kuaförü', icon: 'cut' },
  { id: 'kuafor', name: 'Kadın Kuaförü', icon: 'female' },
  { id: 'guzellik', name: 'Güzellik Merkezi', icon: 'spa' },
  { id: 'dovme', name: 'Dövmeci', icon: 'pen-fancy' },
  { id: 'masaj', name: 'Masaj Salonu', icon: 'hands' },
  { id: 'diyetisyen', name: 'Diyetisyen', icon: 'apple-alt' }
];

interface ExploreScreenProps {
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  location: any;
  dynamicBarbers: any[];
  setSelectedBarber: (barber: any) => void;
  mapLoading: boolean;
  setDynamicBarbers: (data: any[]) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  selectedCategory,
  setSelectedCategory,
  location,
  dynamicBarbers,
  setSelectedBarber,
  mapLoading,
  setDynamicBarbers
}) => {
  if (!selectedCategory) {
    return (
      <View style={styles.categoryScreen}>
        <Text style={styles.mainTitle}>Keşfet</Text>
        <AnimatedPressable style={styles.allMapCard} onPress={() => { setSelectedCategory('all'); }}>
          <Text style={styles.allMapTitle}>TÜMÜNÜ KEŞFET</Text>
        </AnimatedPressable>
        <View style={styles.categoryGrid}>
          {CATEGORIES_DATA.map(cat => (
            <AnimatedPressable key={cat.id} style={styles.categoryCard} onPress={() => { setSelectedCategory(cat.id); }}>
              <FontAwesome5 name={cat.icon as any} size={24} color="#000" />
              <Text style={styles.catName}>{cat.name}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppMap 
        location={location} 
        dynamicBarbers={dynamicBarbers} 
        setSelectedBarber={setSelectedBarber} 
        mapStyle={styles.map} 
        markerBoxStyle={styles.markerBox} 
      />
      {mapLoading && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 8, fontWeight: 'bold' }}>Dükkanlar aranıyor...</Text>
        </View>
      )}
      <AnimatedPressable style={styles.backBtn} onPress={() => { setSelectedCategory(null); setDynamicBarbers([]); }}>
        <Ionicons name="arrow-back" size={24} />
      </AnimatedPressable>
      {dynamicBarbers.length > 0 && (
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{dynamicBarbers.length} dükkan</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryScreen: { flex: 1, padding: 20, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  mainTitle: { fontSize: 40, fontWeight: '900', color: '#000', marginBottom: 20, letterSpacing: -2 },
  allMapCard: { backgroundColor: '#000', padding: 25, borderRadius: 16, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  allMapTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  catName: { marginTop: 10, fontWeight: 'bold', fontSize: 13, color: '#333' },
  map: { width: '100%', height: '100%' },
  markerBox: { backgroundColor: '#fff', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  mapLoadingOverlay: { position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -75}, {translateY: -50}], backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 16, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: '#fff', padding: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
  resultBadge: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  resultBadgeText: { color: '#fff', fontWeight: 'bold' },
});
