import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { supabase } from '@/lib/supabase';

export default function AdminScreen() {
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMapPress = (e: MapPressEvent) => {
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  const handleSaveShop = async () => {
    if (!shopName || !selectedLocation) {
      Alert.alert('Hata', 'Lütfen dükkan adı girin ve haritadan bir konum seçin.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('shops').insert([
      {
        name: shopName,
        description: description,
        address: address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      }
    ]);

    setLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Dükkan başarıyla haritaya ve sisteme eklendi!');
      setShopName('');
      setDescription('');
      setAddress('');
      setSelectedLocation(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Admin Paneli - Dükkan Ekle</Text>
      
      <Text style={styles.instruction}>1. Harita üzerinden dükkanın konumuna uzun basarak işaretleyin.</Text>
      
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 41.0082,
            longitude: 28.9784, // İstanbul merkez
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onLongPress={handleMapPress}
        >
          {selectedLocation && (
            <Marker coordinate={selectedLocation} title="Yeni Dükkan Konumu" />
          )}
        </MapView>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Dükkan Adı</Text>
        <TextInput
          style={styles.input}
          value={shopName}
          onChangeText={setShopName}
          placeholder="Örn: Elite Erkek Kuaförü"
        />

        <Text style={styles.label}>Açıklama / Fiyatlar vb.</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Dükkan hakkında bilgi..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Açık Adres</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Örn: Kadıköy Moda Cad."
        />

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleSaveShop}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Kaydediliyor...' : 'Dükkanı Sisteme Kaydet'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
    marginTop: 60,
    color: '#333',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  map: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#88d399',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
