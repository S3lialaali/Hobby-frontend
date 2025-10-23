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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="screens/establishment"
          options={{ headerShown: false, title: "Establishment" }}
        />
        {/* NEW: make sure these exist */}
        <Stack.Screen name="screens/login"  options={{ headerShown: false, title: "Login" }} />
        <Stack.Screen name="screens/signup" options={{ headerShown: false, title: "Sign up" }} />
        {/* role-based signup screens */}
        <Stack.Screen name="screens/register/role" options={{ headerShown: false, title: "Choose role"}} />
        <Stack.Screen name="screens/register/user" options={{ headerShown: false, title: "Sign up (User)"}} />
        <Stack.Screen name="screens/register/business" options={{ headerShown: false, title: "Sign up (Business)"}} />
      </Stack>
    </SafeAreaProvider>
  );
}
