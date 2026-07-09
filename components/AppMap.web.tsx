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

  const initialLocation = location?.coords || { latitude: 41.0082, longitude: 28.9784 };

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
          
          let color = '#3498db';
          let iconName = 'cut';
          if (barber.type === 'kuaför') { color = '#e84393'; iconName = 'female'; }
          else if (barber.type === 'tırnak') { color = '#fd79a8'; iconName = 'hand-sparkles'; }
          else if (barber.type === 'güzellik') { color = '#a29bfe'; iconName = 'spa'; }

          const customHtmlIcon = L.divIcon({
            html: `<div style="
              background-color: white;
              width: 36px; height: 36px;
              border-radius: 18px;
              border: 2px solid ${color};
              display: flex; justify-content: center; align-items: center;
              box-shadow: 0px 4px 6px rgba(0,0,0,0.3);
              font-size: 16px;
              color: ${color};
              font-family: 'Font Awesome 5 Free'; font-weight: 900;
            "><i class="fas fa-${iconName}"></i></div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
          });

          return (
            <Marker 
              key={barber.id} 
              position={[barber.latitude, barber.longitude]}
              icon={customHtmlIcon}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '120px', padding: '5px' }}>
                  <b style={{ fontSize: '15px', color: '#000', fontFamily: 'system-ui' }}>{barber.name}</b><br/>
                  <span style={{ color: color, fontSize: '12px', fontWeight: 'bold' }}>{barber.type?.toUpperCase()}</span><br/>
                  <div style={{ backgroundColor: '#fff8e1', padding: '4px', borderRadius: '8px', display: 'inline-block', margin: '8px 0' }}>
                    <span style={{ color: '#f39c12', fontWeight: 'bold' }}>⭐ {(barber.rating || 0).toFixed(1)}</span>
                  </div><br/>
                  <button 
                    onClick={() => setSelectedBarber(barber)}
                    style={{ 
                      marginTop: '5px', padding: '8px 15px', backgroundColor: '#000', 
                      color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 'bold', width: '100%', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#000'}
                  >
                    Hemen İncele
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
