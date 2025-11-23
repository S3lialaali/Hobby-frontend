// app/screens/approved_rejected_establishments.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetchEstablishments } from "../../api/establishments";
import { resolveImageUrl } from "../../api/client";

const VIOLET = "#7C3AED";

type Establishment = {
  id: number;
  name: string;
  status: string;
  category?: string | null;
  address?: string | null;
  image_url?: string | null;
};

function StatusPill({ status }: { status: string }) {
  const isApproved = String(status).toLowerCase() === "approved";
  const color = isApproved ? "#16A34A" : "#DC2626";
  const label = isApproved ? "Approved" : "Rejected";
  return (
    <View className="px-2 py-[2px] rounded-full" style={{ backgroundColor: `${color}1A` }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export default function ApprovedRejectedEstablishmentsScreen() {
  const router = useRouter();
  const [approved, setApproved] = useState<Establishment[]>([]);
  const [rejected, setRejected] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [approvedList, rejectedList]: any = await Promise.all([
        fetchEstablishments({ status: "approved" }),
        fetchEstablishments({ status: "rejected" }),
      ]);
      setApproved(Array.isArray(approvedList) ? approvedList : []);
      setRejected(Array.isArray(rejectedList) ? rejectedList : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load establishments");
      setApproved([]);
      setRejected([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sections = useMemo(
    () => [
      { label: `Approved (${approved.length})`, data: approved },
      { label: `Rejected (${rejected.length})`, data: rejected },
    ],
    [approved, rejected]
  );

  const goToDetails = useCallback(
    (id: number) => {
      router.push({ pathname: "/screens/pending_establishment", params: { id: String(id) } });
    },
    [router]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} className="mr-3">
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-[18px] font-extrabold text-gray-900 flex-1">
            Approved & rejected
          </Text>
          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              loadData();
            }}
            hitSlop={10}
          >
            <Feather name="refresh-cw" size={18} color={VIOLET} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="text-[12px] text-gray-500 mt-2">Loading establishments…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-[15px] font-semibold text-gray-900">Couldn’t load list</Text>
            <Text className="text-[12px] text-gray-500 mt-2 text-center">{error}</Text>
            <TouchableOpacity
              onPress={loadData}
              className="mt-4 px-4 py-2 rounded-full bg-white border border-gray-200"
            >
              <Text className="text-[13px] font-semibold text-gray-900">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          >
            {sections.map((sec) => (
              <View key={sec.label} className="mb-5">
                <Text className="text-[14px] font-semibold text-gray-800 mb-2">{sec.label}</Text>
                {sec.data.length === 0 ? (
                  <View className="py-6 px-4 rounded-2xl border border-dashed border-gray-300 bg-white/70">
                    <Text className="text-[12px] text-gray-500">No records</Text>
                  </View>
                ) : (
                  sec.data.map((e) => {
                    const img = e.image_url ? resolveImageUrl(e.image_url) : null;
                    return (
                      <TouchableOpacity
                        key={e.id}
                        activeOpacity={0.88}
                        onPress={() => goToDetails(e.id)}
                        className="mb-3 rounded-2xl border border-gray-200 bg-white overflow-hidden"
                      >
                        <View className="w-full h-44 bg-gray-100">
                          {img ? (
                            <Image source={{ uri: img }} className="w-full h-full" />
                          ) : (
                            <View className="flex-1 items-center justify-center">
                              <Text className="text-[12px] text-gray-400">No image</Text>
                            </View>
                          )}
                          <View className="absolute top-3 left-3">
                            <StatusPill status={e.status} />
                          </View>
                        </View>
                        <View className="px-4 py-3">
                          <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
                            {e.name || `Establishment #${e.id}`}
                          </Text>
                          {e.category ? (
                            <Text className="text-[12px] text-gray-500 mt-[2px]">{e.category}</Text>
                          ) : null}
                          {e.address ? (
                            <Text className="text-[12px] text-gray-500 mt-1" numberOfLines={2}>
                              {e.address}
                            </Text>
                          ) : null}
                          <Text className="text-[11px] text-gray-400 mt-1">ID: {e.id}</Text>
                          <View className="flex-row items-center justify-between mt-3">
                            <Text className="text-[12px] text-gray-500">Tap to view details</Text>
                            <Feather name="chevron-right" size={16} color="#9CA3AF" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
