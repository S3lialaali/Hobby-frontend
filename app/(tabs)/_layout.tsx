
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

const primary_purple = '#7467FF';

export default function Layout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary_purple,     
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 8},
        
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="home" size={32} color={focused ? primary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="search" size={size} color={focused ? primary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="booking"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="calendar" size={size} color={focused ? primary_purple : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome name="user" size={size} color={focused ? primary_purple : color} />
          ),
        }}
      />
    </Tabs>
  );
}
