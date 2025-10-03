// app/_layout.tsx
import { Stack } from "expo-router";
import "./globals.css";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <Stack>

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen
          name="screens/establishment"
          options={{
            headerShown: false,
            title: "Establishment",
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
