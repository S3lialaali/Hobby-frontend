// app/screens/moderation_logs.tsx
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
import { Feather } from "@expo/vector-icons";
import { fetchModerationLogs } from "../../api/moderation";

const VIOLET = "#7C3AED";

type ModerationLog = {
  id: number;
  admin_user_id?: number | null;
  admin_username?: string | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ModerationLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setError(null);
    try {
      const data: any = await fetchModerationLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load moderation logs");
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} className="mr-3">
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-[18px] font-extrabold text-gray-900 flex-1">Moderation logs</Text>
          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              loadLogs();
            }}
            hitSlop={10}
          >
            <Feather name="refresh-cw" size={18} color={VIOLET} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="text-[12px] text-gray-500 mt-2">Loading logs…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-[15px] font-semibold text-gray-900">Couldn’t load logs</Text>
            <Text className="text-[12px] text-gray-500 mt-2 text-center">{error}</Text>
            <TouchableOpacity
              onPress={loadLogs}
              className="mt-4 px-4 py-2 rounded-full bg-white border border-gray-200"
            >
              <Text className="text-[13px] font-semibold text-gray-900">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLogs} />}
          >
            {logs.length === 0 ? (
              <View className="py-12 items-center rounded-2xl border border-dashed border-gray-300">
                <Feather name="file" size={24} color="#9CA3AF" />
                <Text className="text-[14px] text-gray-800 font-semibold mt-3">
                  No moderation logs yet
                </Text>
                <Text className="text-[12px] text-gray-500 mt-1 text-center px-4">
                  Actions taken by admins will appear here.
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <View
                  key={log.id}
                  className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-semibold text-gray-900" numberOfLines={1}>
                      {log.action || "Action"}
                    </Text>
                    <Text className="text-[11px] text-gray-500">{formatDate(log.created_at)}</Text>
                  </View>
                  <Text className="text-[12px] text-gray-600 mt-1">
                    {log.entity_type} #{log.entity_id}
                  </Text>
                  {log.notes ? (
                    <Text className="text-[12px] text-gray-700 mt-2" numberOfLines={3}>
                      {log.notes}
                    </Text>
                  ) : null}
                  {log.admin_username || log.admin_user_id ? (
                    <Text className="text-[11px] text-gray-400 mt-2">
                      By {log.admin_username || `Admin #${log.admin_user_id}`}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
