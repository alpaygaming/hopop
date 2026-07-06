import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onMoveEnd }: { onMoveEnd: any }) {
  const map = useMapEvents({
    moveend() {
      if (onMoveEnd) {
        onMoveEnd(map.getBounds(), map.getZoom());
      }
    },
  });
  return null;
}

export default function AppMap({ location, dynamicBarbers, setSelectedBarber, mapStyle, markerBoxStyle }: any) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <View style={[mapStyle, { justifyContent: 'center', alignItems: 'center' }]}><Text>Harita Yükleniyor...</Text></View>;
  }

  const initialLocation = location || { latitude: 41.0082, longitude: 28.9784 };

  return (
    <View style={mapStyle}>
      <MapContainer 
        center={[initialLocation.latitude, initialLocation.longitude]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoveEnd={(bounds: any) => console.log('Map moved', bounds)} />
        
        {dynamicBarbers && dynamicBarbers.map((barber: any) => {
          if (!barber.latitude || !barber.longitude) return null;
          return (
            <Marker 
              key={barber.id} 
              position={[barber.latitude, barber.longitude]}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <b style={{ fontSize: '14px' }}>{barber.name}</b><br/>
                  <span style={{ color: '#666' }}>{barber.type?.toUpperCase()}</span><br/>
                  <span style={{ color: '#f39c12' }}>⭐ {(barber.rating || 0).toFixed(1)}</span><br/>
                  <button 
                    onClick={() => setSelectedBarber(barber)}
                    style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Detayları Gör
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </View>
  );
}
