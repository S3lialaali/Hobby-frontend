// app/(admin)/_layout.tsx
import { Tabs } from "expo-router";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="establishments" options={{ title: "Establishments" }} />
      <Tabs.Screen name="Complaints" options={{ title: "Complaints" }} /> 
      <Tabs.Screen name="Settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
