import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';

export default function TabLayout() {
  const { userRole } = useApp();
  const router = useRouter();
  const segments = useSegments();
  
  // Custom Tab Bar implementation
  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    return (
      <View style={styles.navBar}>
        {userRole === 'admin' ? (
          <>
            <TabButton routeName="index" icon="map" label="KEŞFET" state={state} navigation={navigation} />
            <TabButton routeName="shops" icon="storefront" label="MAĞAZALAR" state={state} navigation={navigation} />
            <TabButton routeName="appointments" icon="calendar" label="RANDEVULAR" state={state} navigation={navigation} />
            <TabButton routeName="admin_panel" icon="settings" label="SİSTEM" state={state} navigation={navigation} />
          </>
        ) : userRole === 'owner' ? (
          <TabButton routeName="owner_panel" icon="stats-chart" label="İŞLETME PANELİ" state={state} navigation={navigation} />
        ) : (
          <>
            <TabButton routeName="index" icon="map" label="KEŞFET" state={state} navigation={navigation} />
            <TabButton routeName="shops" icon="storefront" label="MAĞAZALAR" state={state} navigation={navigation} />
            <TabButton routeName="appointments" icon="calendar" label="RANDEVULAR" state={state} navigation={navigation} />
            <TabButton routeName="profile" icon="person" label="PROFİL" state={state} navigation={navigation} />
          </>
        )}
      </View>
    );
  };

  const TabButton = ({ routeName, icon, label, state, navigation }: any) => {
    // Check if the route exists in state to know if it's active
    const route = state.routes.find((r: any) => r.name === routeName);
    const isFocused = state.index === state.routes.indexOf(route);
    
    return (
      <AnimatedPressable 
        style={styles.navItem} 
        onPress={() => {
          if (!isFocused) {
             navigation.navigate(routeName);
          }
        }}
      >
        <Ionicons name={icon as any} size={22} color={isFocused ? "#000" : "#ccc"} />
        <Text style={[styles.navText, { color: isFocused ? "#000" : "#ccc" }]}>{label}</Text>
      </AnimatedPressable>
    );
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shops" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="owner_panel" />
      <Tabs.Screen name="admin_panel" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navBar: { height: 90, flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', paddingBottom: 24, paddingTop: 10, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
});
