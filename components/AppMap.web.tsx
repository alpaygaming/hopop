import React from 'react';
import { View, Text } from 'react-native';

export default function AppMap({ location, dynamicBarbers, setSelectedBarber, mapStyle, markerBoxStyle }: any) {
  return (
    <View style={[mapStyle, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }]}>
      <Text style={{ textAlign: 'center', padding: 20, color: '#333' }}>
        Interactive map is not supported on web. Please use our mobile app.
      </Text>
    </View>
  );
}
