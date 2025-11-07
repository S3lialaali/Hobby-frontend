// app/(admin)/dashboards.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  fetchEstablishments,
  fetchBookings,
  resolveImageUrl,
  API_BASE_URL,
} from '../../api';

const VIOLET = '#7C3AED';

type User = {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'business' | 'admin';
  created_at?: string;
};

type Establishment = {
  id: number;
  name: string;
  image_url?: string | null;
  clicks?: number | null;
  category?: string | null;
  status?: string;
};

type Booking = {
  id: number;
  user_id: number;
  activity_id: number;
  schedule_id?: number | null;
  booked_for?: string | null;
  status: 'confirmed' | 'expired' | 'canceled' | 'cancelled';
  created_at?: string;
};

function StatusPill({ status }: { status: Booking['status'] }) {
  const norm = status === 'cancelled' ? 'canceled' : status;
  let bg = '#E5E7EB';
  let color = '#374151';
  if (norm === 'confirmed') {
    bg = '#DCFCE7';
    color = '#166534';
  } else if (norm === 'canceled') {
    bg = '#FEE2E2';
    color = '#B91C1C';
  } else if (norm === 'expired') {
    bg = '#E0F2FE';
    color = '#075985';
  }
  return (
    <View className="px-2 py-[2px] rounded-full" style={{ backgroundColor: bg }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {norm}
      </Text>
    </View>
  );
}

function formatDateTime(dt?: string | null) {
  if (!dt) return '—';
  const d = new Date(dt.includes('T') ? dt : dt.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminDashboardScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      // users
      const usersRes = await fetch(`${API_BASE_URL}/api/users`);
      const usersData = usersRes.ok ? await usersRes.json() : [];

      // establishments
      const estData = await fetchEstablishments({ limit: 200, status: 'approved' });

      // bookings
      const bookData = await fetchBookings({}); // admin: see all

      setUsers(Array.isArray(usersData) ? usersData : []);
      setEstablishments(Array.isArray(estData) ? estData : []);
      setBookings(Array.isArray(bookData) ? bookData : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalUsers = users.length;
  const totalEsts = establishments.length;
  const totalBookings = bookings.length;

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5);
  }, [bookings]);

  const topEstablishments = useMemo(() => {
    return [...establishments]
      .sort((a, b) => (Number(b.clicks || 0) - Number(a.clicks || 0)))
      .slice(0, 5);
  }, [establishments]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-3 text-gray-600">Loading admin dashboard…</Text>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-[16px] font-semibold text-gray-900">Oops</Text>
          <Text className="mt-2 text-[14px] text-gray-600 text-center">{error}</Text>
          <TouchableOpacity
            onPress={load}
            className="mt-4 px-5 py-2 rounded-full bg-white border border-gray-200"
          >
            <Text className="text-[13px] font-semibold text-gray-900">Try again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          {/* Header */}
          <View className="px-5 pt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-[28px] font-extrabold text-gray-900">Admin dashboard</Text>
              <Text className="text-[13px] text-gray-500 mt-1">
                Overview of users, bookings, and establishments
              </Text>
            </View>
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${VIOLET}1A` }}
            >
              <Text className="text-[14px] font-bold" style={{ color: VIOLET }}>
                A
              </Text>
            </View>
          </View>

          {/* Stat cards */}
          <View className="px-5 mt-6 flex-row -mx-1">
            <View className="flex-1 mx-1 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-[12px] text-gray-500">Users</Text>
              <Text className="mt-1 text-[24px] font-extrabold text-gray-900">{totalUsers}</Text>
              <Text className="mt-1 text-[11px] text-gray-400">Total registered</Text>
            </View>
            <View className="flex-1 mx-1 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-[12px] text-gray-500">Establishments</Text>
              <Text className="mt-1 text-[24px] font-extrabold text-gray-900">{totalEsts}</Text>
              <Text className="mt-1 text-[11px] text-gray-400">Approved & active</Text>
            </View>
            <View className="flex-1 mx-1 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-[12px] text-gray-500">Bookings</Text>
              <Text className="mt-1 text-[24px] font-extrabold text-gray-900">{totalBookings}</Text>
              <Text className="mt-1 text-[11px] text-gray-400">All time</Text>
            </View>
          </View>

          {/* Recent bookings */}
          <View className="px-5 mt-10">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[20px] font-bold text-gray-900">Recent bookings</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/booking')}
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: `${VIOLET}1A` }}
              >
                <Text className="text-[12px] font-semibold" style={{ color: VIOLET }}>
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            <View className="rounded-2xl border border-gray-200 bg-white">
              {recentBookings.length === 0 ? (
                <View className="px-4 py-6 items-center">
                  <Text className="text-[13px] text-gray-500">No bookings yet.</Text>
                </View>
              ) : (
                recentBookings.map((b, idx) => (
                  <View key={b.id}>
                    <View className="flex-row items-center px-4 py-3">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${VIOLET}1A` }}
                      >
                        <Text className="text-[11px] font-bold" style={{ color: VIOLET }}>
                          #{b.id}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-gray-900">
                          User {b.user_id} → Activity {b.activity_id}
                        </Text>
                        <Text className="text-[12px] text-gray-500">
                          {formatDateTime(b.booked_for || b.created_at)}
                        </Text>
                      </View>
                      <StatusPill status={b.status} />
                    </View>
                    {idx < recentBookings.length - 1 && <View className="h-px bg-gray-200 ml-16" />}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Top establishments */}
          <View className="px-5 mt-10">
            <Text className="text-[20px] font-bold text-gray-900 mb-3">Top establishments</Text>
            <View className="rounded-2xl border border-gray-200 bg-white">
              {topEstablishments.length === 0 ? (
                <View className="px-4 py-6 items-center">
                  <Text className="text-[13px] text-gray-500">No establishments yet.</Text>
                </View>
              ) : (
                topEstablishments.map((est, idx) => {
                  const imgUri = est.image_url ? resolveImageUrl(est.image_url) : null;
                  return (
                    <TouchableOpacity
                      key={est.id}
                      activeOpacity={0.85}
                      className="flex-row items-center px-4 py-3"
                      onPress={() =>
                        router.push({
                          pathname: '/screens/establishment',
                          params: { id: String(est.id) },
                        })
                      }
                    >
                      <View className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 mr-3">
                        {imgUri ? (
                          <Image source={{ uri: imgUri }} className="w-full h-full" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Text className="text-[10px] text-gray-300">No image</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>
                          {est.name}
                        </Text>
                        <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                          {est.category || '—'}
                        </Text>
                      </View>
                      <View className="items-end ml-3">
                        <Text className="text-[12px] text-gray-500 mb-1">Clicks</Text>
                        <Text className="text-[14px] font-bold text-gray-900">
                          {Number(est.clicks || 0)}
                        </Text>
                      </View>
                      {idx < topEstablishments.length - 1 && (
                        <View className="absolute bottom-0 left-16 right-0 h-px bg-gray-200" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
