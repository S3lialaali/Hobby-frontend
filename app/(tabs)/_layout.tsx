import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../sessions/AuthContext';

const colors = {
  primary_orange: '#FFC067',
  secondary_purple: '#7C3AED',
  accent_teal: '#67F2FF',
};

export default function Layout() {
  const { initializing, user } = useAuth();

  // When auth finishes initializing, kick users to login if not authenticated
  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/screens/login');
    }
  }, [initializing, user]);

  // While restoring session, show a tiny loader instead of tabs
  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // If not logged in, don't render tabs (redirect happens in useEffect)
  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary_purple,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 8 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="home" size={32} color={focused ? colors.secondary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="search" size={size} color={focused ? colors.secondary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="booking"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="calendar" size={size} color={focused ? colors.secondary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="user" size={size} color={focused ? colors.secondary_purple : color} />
          ),
        }}
      />
    </Tabs>
  );
}
