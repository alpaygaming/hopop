import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons using unpkg to avoid webpack require issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onMapPress }: { onMapPress: any }) {
  useMapEvents({
    click(e) {
      if (onMapPress) {
        onMapPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
      }
    },
  });
  return null;
}

export default function AdminMap({ style, selectedLocation, onMapPress, systemShops = [] }: any) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}><Text>Harita Yükleniyor...</Text></View>;
  }

  return (
    <View style={style}>
      <MapContainer 
        center={[41.0082, 28.9784]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapPress={onMapPress} />
        {selectedLocation && (
          <Marker 
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onMapPress) onMapPress({ nativeEvent: { coordinate: { latitude: position.lat, longitude: position.lng } } });
              }
            }}
          >
            <Popup>Yeni Dükkan Konumu (Sürükleyebilirsiniz)</Popup>
          </Marker>
        )}
        
        {systemShops.map((shop: any) => {
          if (!shop.latitude || !shop.longitude) return null;
          return (
            <Marker 
              key={shop.id} 
              position={[shop.latitude, shop.longitude]}
            >
              <Popup>{shop.name}</Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </View>
  );
}
