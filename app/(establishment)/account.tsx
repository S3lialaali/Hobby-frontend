import React, { useState } from "react";
import { View, Text, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/sessions/AuthContext"; 

export default function EstablishmentAccountScreen() {
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await signOut(); // should call /auth/logout + clear tokens/storage
      router.replace("/screens/login");
    } catch (err) {
      console.error("Logout error", err);
      Alert.alert("Error", "Could not log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-xl font-bold mb-4">Account</Text>

      {user && (
        <View className="mb-6">
          <Text className="text-base mb-1">
            Logged in as: <Text className="font-semibold">{user.username}</Text>
          </Text>
          <Text className="text-sm text-gray-500">
            {user.email ?? user.phone ?? ""}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleLogout}
        disabled={loading}
        className="mt-2 rounded-2xl border border-red-500 px-4 py-3 items-center justify-center"
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-red-600 font-semibold">Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
