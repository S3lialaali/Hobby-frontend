// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AuthProvider } from "../sessions/AuthContext";
import "./globals.css";

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
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack initialRouteName="screens/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(establishment)" options={{ headerShown: false }} />
        <Stack.Screen
          name="screens/establishment"
          options={{ headerShown: false, title: "Establishment" }}
        />
        
        <Stack.Screen name="screens/login"  options={{ headerShown: false, title: "Login" }} />
        <Stack.Screen name="screens/forgot-password" options={{ headerShown: false, title: "Forgot Password" }} />
        <Stack.Screen name="screens/verify-email" options={{ headerShown: false, title: "Verify Email" }} />
        <Stack.Screen name="screens/verify-phone" options={{ headerShown: false, title: "Verify Phone" }} />
        {/* role-based signup screens */}
        <Stack.Screen name="screens/signup/role" options={{ headerShown: false, title: "Choose role"}} />
        <Stack.Screen name="screens/signup/user" options={{ headerShown: false, title: "Sign up (User)"}} />
        <Stack.Screen name="screens/signup/business" options={{ headerShown: false, title: "Sign up (Business)"}} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
