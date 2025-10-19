import { Stack } from "expo-router";
import "./globals.css";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const METRICS =
  initialWindowMetrics
    ? {
        ...initialWindowMetrics,
        insets: { ...initialWindowMetrics.insets, bottom: 0 },
      }
    : initialWindowMetrics;

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
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
