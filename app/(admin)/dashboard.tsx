// app/(admin)/dashboard.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../sessions/AuthContext";
import { fetchEstablishments } from "../../api/establishments";
import { fetchModerationLogs } from "../../api/moderation";
import { fetchReports, listUsers } from "../../api/users";
import { fetchBookings } from "../../api/bookings";

const VIOLET = "#7C3AED";

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

type Establishment = {
  id: number;
  status?: string | null;
};

type UserReport = {
  id: number;
  status?: string | null;
};

function SummaryCard({
  title,
  value,
  subtitle,
  bgColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  bgColor: string;
}) {
  return (
    <View
      className="w-[48%] rounded-2xl px-4 py-3 mb-4 border bg-white"
      style={{
        backgroundColor: `${bgColor}1A`,
        borderColor: `${bgColor}33`,
      }}
    >
      <Text className="text-[12px] font-semibold text-gray-700 mb-1">
        {title}
      </Text>
      <Text
        className="text-[24px] font-extrabold mb-1"
        style={{ color: bgColor }}
      >
        {value}
      </Text>
      {subtitle ? (
        <Text className="text-[11px] text-gray-600" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function QueueItem({
  icon,
  title,
  status,
  progress,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  progress?: number; // 0–100
  onPress: () => void;
}) {
  const clamped = Math.max(0, Math.min(progress ?? 0, 100));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="flex-row items-center mb-3 rounded-2xl bg-white px-4 py-3"
    >
      <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3 bg-gray-100">
        {icon}
      </View>

      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-gray-900">
          {title}
        </Text>
        <Text className="text-[11px] text-gray-500 mt-0.5">{status}</Text>
        <View className="h-1 rounded-full bg-gray-200 mt-2 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${clamped}%`,
              backgroundColor: VIOLET,
            }}
          />
        </View>
      </View>

      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [openReportsCount, setOpenReportsCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [moderationCount, setModerationCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    (user as any)?.name ||
    (user as any)?.fullName ||
    (user as any)?.username ||
    (user as any)?.email ||
    "Admin";

  const roleLabel = (user as any)?.role
    ? String((user as any).role).charAt(0).toUpperCase() +
      String((user as any).role).slice(1)
    : "Admin";

  const loadStats = useCallback(async () => {
    setError(null);
    try {
      const [
        pendingEst,
        approvedEst,
        rejectedEst,
        reports,
        users,
        bookings,
        logs,
      ] = await Promise.all([
        fetchEstablishments({ status: "pending" }) as Promise<Establishment[] | null>,
        fetchEstablishments({ status: "approved" }) as Promise<Establishment[] | null>,
        fetchEstablishments({ status: "rejected" }) as Promise<Establishment[] | null>,
        fetchReports() as Promise<UserReport[] | null>,
        listUsers() as Promise<any[] | null>,
        fetchBookings() as Promise<any[] | null>,
        fetchModerationLogs() as Promise<any[] | null>,
      ]);

      const pendingList = Array.isArray(pendingEst) ? pendingEst : [];
      const approvedList = Array.isArray(approvedEst) ? approvedEst : [];
      const rejectedList = Array.isArray(rejectedEst) ? rejectedEst : [];
      const repList = Array.isArray(reports) ? reports : [];
      const userList = Array.isArray(users) ? users : [];
      const bookingList = Array.isArray(bookings) ? bookings : [];
      const logsList = Array.isArray(logs) ? logs : [];

      setPendingCount(pendingList.length);
      setApprovedCount(approvedList.length);
      setRejectedCount(rejectedList.length);

      setOpenReportsCount(
        repList.filter((r) => r.status !== "resolved").length
      );

      const activeUsers = userList.filter((u) => {
        const status = String(u?.status ?? "active").toLowerCase();
        if (status === "inactive" || status === "banned") return false;
        return true;
      }).length;
      setActiveUsersCount(activeUsers);

      setBookingsCount(bookingList.length);
      setModerationCount(logsList.length);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard data");
      setPendingCount(0);
      setApprovedCount(0);
      setRejectedCount(0);
      setOpenReportsCount(0);
      setActiveUsersCount(0);
      setBookingsCount(0);
      setModerationCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  // Guard if non-admin somehow reaches this
  if (user && (user as any).role && (user as any).role !== "admin") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          className="flex-1 bg-white items-center justify-center px-6"
          edges={["top"]}
        >
          <Text className="text-[18px] font-semibold text-gray-900 mb-2">
            Restricted area
          </Text>
          <Text className="text-[13px] text-gray-500 text-center">
            This section is only available for admin accounts.
          </Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-[#F3F4F6]" edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-2">
            <Text className="text-[28px] font-extrabold text-gray-900">
              Dashboard
            </Text>
            <Text className="text-[13px] text-gray-500 mt-1">
              Overview & metrics
            </Text>

            {error && (
              <View className="mt-3 px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                <Text className="text-[11px] text-red-600">{error}</Text>
              </View>
            )}
          </View>

          {/* 2x2 grid of summary cards */}
          <View className="px-5 mt-4 flex-row flex-wrap justify-between">
            {loading && !refreshing ? (
              <View className="w-full py-8 items-center">
                <ActivityIndicator />
              </View>
            ) : (
              <>
                <SummaryCard
                  title="Active Establishments"
                  value={approvedCount}
                  subtitle="Approved & visible"
                  bgColor="#16A34A"
                />
                <SummaryCard
                  title="Active Users"
                  value={activeUsersCount}
                  subtitle="Currently active accounts"
                  bgColor="#7C3AED"
                />
                <SummaryCard
                  title="Total Bookings"
                  value={bookingsCount}
                  subtitle="All-time bookings"
                  bgColor="#F97316"
                />
                <SummaryCard
                  title="Moderation logs"
                  value={moderationCount}
                  subtitle="All admin actions logged"
                  bgColor="#0EA5E9"
                />
              </>
            )}
          </View>

          {/* "Your queues" section */}
          <View className="px-5 mt-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[13px] font-semibold text-gray-600">
                YOUR QUEUES
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(admin)/establishments")}
              >
                <Text className="text-[12px] font-semibold text-violet-600">
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            <QueueItem
              icon={<Feather name="check-square" size={20} color={VIOLET} />}
              title="Establishment Approvals"
              status={
                pendingCount > 0
                  ? `${pendingCount} pending approval`
                  : "All establishments reviewed"
              }
              progress={pendingCount === 0 ? 100 : 35}
              onPress={() => router.push("/(admin)/establishments")}
            />

            <QueueItem
              icon={
                <MaterialIcons name="report-problem" size={20} color="#F97316" />
              }
              title="User Reports & Complaints"
              status={
                openReportsCount > 0
                  ? `${openReportsCount} open report(s)`
                  : "No open reports right now"
              }
              progress={openReportsCount === 0 ? 100 : 40}
              onPress={() => router.push("/(admin)/Complaints")}
            />

            <QueueItem
              icon={<Feather name="settings" size={20} color="#22C55E" />}
              title="Admin Settings"
              status="Roles, preferences & advanced options"
              progress={60}
              onPress={() => router.push("/(admin)/profile")}
            />
          </View>

          {/* Small text block like in the design */}
          <View className="px-5 mt-8">
            <View className="rounded-2xl bg-white px-4 py-3">
              <Text className="text-[13px] text-gray-800 mb-1 font-semibold">
                Overview
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1">
                Use this dashboard to keep track of approvals, reports and
                admin tasks.
              </Text>
            </View>
          </View>

          <View className="px-5 mt-10 mb-4 items-center opacity-60">
            <Text className="text-[11px] text-gray-500">
              Hobby App · Admin Panel
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
