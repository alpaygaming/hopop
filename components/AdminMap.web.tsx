import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function AdminMap({ style, selectedLocation, onMapPress }: any) {
  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }]}>
      <Text style={{ textAlign: 'center', padding: 20, color: '#333' }}>
        Interactive map is not supported on web. 
        Click the button below to use a default center location (Istanbul).
      </Text>
      <TouchableOpacity 
        style={{ padding: 10, backgroundColor: '#3498db', borderRadius: 5 }}
        onPress={() => onMapPress({ nativeEvent: { coordinate: { latitude: 41.0082, longitude: 28.9784 } } })}
      >
        <Text style={{ color: '#fff' }}>İstanbul Merkez Seç</Text>
      </TouchableOpacity>
      {selectedLocation && (
        <Text style={{ marginTop: 10, fontWeight: 'bold' }}>
          Seçilen Konum: {selectedLocation.latitude}, {selectedLocation.longitude}
        </Text>
      )}
    </View>
  );
}
