// app/(admin)/establishments.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { API_BASE_URL, resolveImageUrl } from '../../api';

const VIOLET = '#7C3AED';

type Establishment = {
  id: number;
  owner_user_id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  address?: string | null;
  image_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
};

export default function AdminEstablishmentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/establishments?status=pending`);
      if (!res.ok) throw new Error('Failed to load establishments');
      const data = (await res.json()) as Establishment[] | any;
      const list = Array.isArray(data) ? data : [];
      setPending(list.filter((e) => e.status === 'pending'));
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch pending establishments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function setStatus(id: number, status: 'approved' | 'rejected') {
    try {
      const res = await fetch(`${API_BASE_URL}/api/establishments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Request failed');
      }
      setPending((prev) => prev.filter((e) => e.id !== id));
    } catch (e: any) {
      Alert.alert('Could not update', e?.message || 'Please try again.');
    }
  }

  function onApprove(est: Establishment) {
    Alert.alert(
      'Approve establishment?',
      `This will make "${est.name}" visible to users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: () => setStatus(est.id, 'approved') },
      ]
    );
  }

  function onReject(est: Establishment) {
    Alert.alert(
      'Reject establishment?',
      `This will mark "${est.name}" as rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => setStatus(est.id, 'rejected'),
        },
      ]
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-3 text-gray-600">Loading pending establishments…</Text>
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
            onPress={fetchPending}
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
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPending();
              }}
            />
          }
        >
          {/* Header */}
          <View className="px-5 pt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-[28px] font-extrabold text-gray-900">Pending</Text>
              <Text className="text-[13px] text-gray-500 mt-1">
                Establishments waiting for approval
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/dashboard')}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${VIOLET}1A` }}
            >
              <Text className="text-[12px] font-semibold" style={{ color: VIOLET }}>
                Dashboard
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <View className="px-5 mt-6">
            {pending.length === 0 ? (
              <View className="mt-4 rounded-2xl border border-gray-200 p-6 items-center">
                <View className="w-14 h-14 rounded-2xl mb-3" style={{ backgroundColor: `${VIOLET}1A` }} />
                <Text className="text-[18px] font-bold text-gray-900 text-center">
                  No pending establishments
                </Text>
                <Text className="mt-1 text-[13px] text-gray-600 text-center">
                  New submissions will appear here.
                </Text>
              </View>
            ) : (
              pending.map((est) => {
                const img = est.image_url ? resolveImageUrl(est.image_url) : null;
                return (
                  <TouchableOpacity
                    key={est.id}
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: '/screens/pending_establishment', // rename if your file has a different name
                        params: { id: String(est.id) },
                      })
                    }
                    className="mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden"
                  >
                    <View className="w-full h-40 bg-gray-100">
                      {img ? (
                        <Image source={{ uri: img }} className="w-full h-full" />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-gray-400 text-[12px]">No image</Text>
                        </View>
                      )}
                      <View
                        style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#F97316' }}
                        className="px-2 py-[2px] rounded-full"
                      >
                        <Text className="text-white text-[11px] font-semibold">Pending</Text>
                      </View>
                    </View>
                    <View className="p-4">
                      <Text className="text-[17px] font-extrabold text-gray-900" numberOfLines={1}>
                        {est.name}
                      </Text>
                      {est.category ? (
                        <Text className="text-[13px] text-gray-500 mt-1">{est.category}</Text>
                      ) : null}
                      {est.address ? (
                        <Text className="text-[12px] text-gray-500 mt-1" numberOfLines={2}>
                          {est.address}
                        </Text>
                      ) : null}
                      <Text className="text-[11px] text-gray-400 mt-1">
                        Owner user id: {est.owner_user_id}
                      </Text>

                      <View className="mt-4 flex-row">
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => onApprove(est)}
                          className="px-4 py-2 rounded-full mr-3"
                          style={{ backgroundColor: VIOLET }}
                        >
                          <Text className="text-white text-[14px] font-semibold">Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => onReject(est)}
                          className="px-4 py-2 rounded-full border border-red-200"
                        >
                          <Text className="text-[14px] font-semibold text-red-500">Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
