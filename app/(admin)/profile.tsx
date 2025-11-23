// app/(admin)/profile.tsx
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../sessions/AuthContext";

const VIOLET = "#7C3AED";

function InfoBadge({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <View className="mb-2">
      <Text className="text-[11px] text-gray-500">{label}</Text>
      <Text className="text-[14px] font-semibold text-gray-900 mt-[2px]">{value}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  style,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  style?: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className="flex-1 rounded-2xl px-4 py-3 border border-gray-200 bg-white"
      style={style}
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: `${VIOLET}1A` }}>
        {icon}
      </View>
      <Text className="text-[13px] font-semibold text-gray-900">{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, initializing, loading, signOut } = useAuth();

  const displayName = useMemo(() => {
    const u: any = user || {};
    return (
      u.name ||
      u.fullName ||
      u.username ||
      u.email ||
      (u.id ? `Admin #${u.id}` : "Admin")
    );
  }, [user]);

  const roleLabel = useMemo(() => {
    const role = String((user as any)?.role || "admin");
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, [user]);

  const initial = displayName ? displayName.charAt(0).toUpperCase() : "A";

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };


  if (initializing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator />
          <Text className="text-gray-500 mt-2">Loading profile…</Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-[#F3F4F6]">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          <View className="rounded-3xl bg-white border border-gray-200 p-5">
            <View className="flex-row items-center">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: `${VIOLET}1A` }}
              >
                <Text className="text-[22px] font-bold" style={{ color: VIOLET }}>
                  {initial}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[20px] font-extrabold text-gray-900" numberOfLines={1}>
                  {displayName}
                </Text>
                <View className="flex-row items-center mt-[6px]">
                  <View
                    className="px-2 py-[2px] rounded-full mr-2"
                    style={{ backgroundColor: `${VIOLET}1A` }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: VIOLET }}>
                      {roleLabel}
                    </Text>
                  </View>
                  {user?.email ? (
                    <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                      {user.email}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="mt-5 border-t border-gray-100 pt-4">
              <InfoBadge label="User ID" value={(user as any)?.id ? `#${(user as any).id}` : undefined} />
              <InfoBadge label="Username" value={(user as any)?.username} />
              <InfoBadge label="Phone" value={(user as any)?.phone} />
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-[14px] font-semibold text-gray-700 mb-2">
              Quick actions
            </Text>
            <View className="flex-row" style={{ flexWrap: "wrap" }}>
              <QuickAction
                icon={<FontAwesome name="dashboard" size={18} color={VIOLET} />}
                label="Dashboard"
                onPress={() => router.push("/(admin)/dashboard")}
                style={{ marginRight: 12 }}
              />
              <QuickAction
                icon={<FontAwesome name="building" size={18} color={VIOLET} />}
                label="Pending establishments"
                onPress={() => router.push("/(admin)/establishments")}
                style={{ marginRight: 12 }}
              />
              <QuickAction
                icon={<Feather name="alert-circle" size={18} color={VIOLET} />}
                label="User reports"
                onPress={() => router.push("/(admin)/Complaints")}
              />
            </View>
          </View>

          <View className="mt-6 rounded-3xl bg-white border border-gray-200 p-5">
            <Text className="text-[15px] font-semibold text-gray-900 mb-3">
              Administration
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/screens/moderation_logs")}
              className="flex-row items-center justify-between py-3"
            >
              <View className="flex-row items-center">
                <Feather name="file-text" size={18} color="#111827" />
                <Text className="text-[14px] text-gray-800 ml-3">
                  Moderation logs
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/screens/approved_rejected_establishments")}
              className="flex-row items-center justify-between py-3"
            >
              <View className="flex-row items-center">
                <Feather name="layers" size={18} color="#111827" />
                <Text className="text-[14px] text-gray-800 ml-3">
                  Approved & rejected establishments
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View className="mt-6 rounded-3xl bg-white border border-gray-200 p-5">
            <Text className="text-[15px] font-semibold text-gray-900 mb-3">
              Account
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSignOut}
              className="flex-row items-center justify-between py-3"
            >
              <View className="flex-row items-center">
                <Feather name="log-out" size={18} color="#DC2626" />
                <Text className="text-[14px] text-red-600 ml-3 font-semibold">
                  Sign out
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
