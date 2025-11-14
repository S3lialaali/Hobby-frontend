import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { router } from "expo-router";
import { loadRefreshToken, saveRefreshToken, clearRefreshToken } from "../sessions/storage";
import { setAccessToken } from "../api/client";
import { post } from "../api/client";

export default function Index() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadRefreshToken();
        if (!stored) throw new Error("no_refresh");

        const data = await post("/auth/refresh", { refreshToken: stored });
        setAccessToken(data.accessToken);
        await saveRefreshToken(data.refreshToken);
        router.replace("/(tabs)");
      } catch {
        await clearRefreshToken();
        setAccessToken(null);
        router.replace("/screens/login");
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Starting...</Text>
      </View>
    )
  }
  return null;
}

