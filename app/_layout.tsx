// app/_layout.tsx
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
      <Stack initialRouteName="screens/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen
          name="screens/establishment"
          options={{ headerShown: false, title: "Establishment" }}
        />
        {/* NEW: make sure these exist */}
        <Stack.Screen name="screens/login"  options={{ headerShown: false, title: "Login" }} />
        {/* role-based signup screens */}
        <Stack.Screen name="screens/signup/role" options={{ headerShown: false, title: "Choose role"}} />
        <Stack.Screen name="screens/signup/user" options={{ headerShown: false, title: "Sign up (User)"}} />
        <Stack.Screen name="screens/signup/business" options={{ headerShown: false, title: "Sign up (Business)"}} />
      </Stack>
    </SafeAreaProvider>
  );
}
