import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../sessions/AuthContext";

export default function Index() {
  const { initializing, user } = useAuth();

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Starting...</Text>
      </View>
    );
  }

   if (!user) {
    return <Redirect href="/screens/login" />;
  }

  // Logged in: route by role
  if (user.role === "business") {
    // business -> establishment interface
    return <Redirect href="/(establishment)/dashboard" />; // or "/(establishment)/dashboard" if that’s your entry
  }

  // (optional) admin role
  if (user.role === "admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  // default -> normal user tabs
  return <Redirect href="/(tabs)" />;
}
