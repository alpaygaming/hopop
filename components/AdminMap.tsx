import React from 'react';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';

export default function AdminMap({ style, selectedLocation, onMapPress }: any) {
  return (
    <MapView
      style={style}
      initialRegion={{
        latitude: 41.0082,
        longitude: 28.9784, // İstanbul merkez
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      onLongPress={onMapPress}
    >
      {selectedLocation && (
        <Marker coordinate={selectedLocation} title="Yeni Dükkan Konumu" />
      )}
    </MapView>
  );
}
