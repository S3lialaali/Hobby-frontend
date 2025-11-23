// app/(admin)/_layout.tsx
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Tabs, router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../../sessions/AuthContext";

const colors = {
  primary_orange: "#FFC067",
  secondary_purple: "#7C3AED",
  accent_teal: "#67F2FF",
};

export default function AdminLayout() {
  const { initializing, user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/screens/login");
    } else if (!initializing && user && !isAdmin) {
      router.replace("/(tabs)");
    }
  }, [initializing, user, isAdmin]);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.secondary_purple,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 8 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome
              name="dashboard"
              size={size}
              color={focused ? colors.secondary_purple : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="establishments"
        options={{
          title: "Establishments",
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome
              name="building"
              size={size}
              color={focused ? colors.secondary_purple : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Complaints"
        options={{
          title: "Complaints",
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome
              name="exclamation-triangle"
              size={size}
              color={focused ? colors.secondary_purple : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => (
            <FontAwesome
              name="user"
              size={size}
              color={focused ? colors.secondary_purple : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
