import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { View, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function AppMap({ location, dynamicBarbers, setSelectedBarber, mapStyle, markerBoxStyle }: any) {
  if (!location) return null;
  
  return (
    <MapView 
      style={mapStyle} 
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} 
      initialRegion={{ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }} 
      showsUserLocation={true}
    >
      {dynamicBarbers.map((b: any) => (
         <Marker key={b.id} coordinate={{ latitude: b.latitude, longitude: b.longitude }} onPress={() => setSelectedBarber(b)}>
            <View style={[
              markerBoxStyle, 
              b.type === 'berber' && { borderColor: '#3498db' }, 
              b.type === 'kuaför' && { borderColor: '#e84393' }, 
              b.type === 'tırnak' && { borderColor: '#fd79a8' }, 
              b.type === 'güzellik' && { borderColor: '#a29bfe' }
            ]}>
               <FontAwesome5 name={b.type === 'berber' ? 'cut' : b.type === 'kuaför' ? 'female' : b.type === 'tırnak' ? 'hand-sparkles' : 'spa'} size={14} color="#000" />
            </View>
         </Marker>
      ))}
    </MapView>
  );
}
