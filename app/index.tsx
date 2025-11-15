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

  // After init: go to tabs if logged in, otherwise to login
  return <Redirect href={user ? "/(tabs)" : "/screens/login"} />;
}
