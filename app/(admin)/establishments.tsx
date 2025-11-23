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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { API_BASE_URL, resolveImageUrl } from '../../api/client';
import { createModerationLog } from '../../api/moderation';
import { useAuth } from '../../sessions/AuthContext';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [logModal, setLogModal] = useState<{
    visible: boolean;
    est: Establishment | null;
    action: 'approved' | 'rejected';
    notes: string;
  }>({ visible: false, est: null, action: 'approved', notes: '' });

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

  async function setStatus(est: Establishment, status: 'approved' | 'rejected', notes?: string) {
    setActionLoadingId(est.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/establishments/${est.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Request failed');
      }
      if ((user as any)?.id) {
        try {
          await createModerationLog({
            admin_user_id: (user as any).id,
            action: status === 'approved' ? 'approve_establishment' : 'reject_establishment',
            entity_type: 'establishment',
            entity_id: est.id,
            notes: notes?.trim?.() || null,
          });
        } catch (logErr: any) {
          Alert.alert(
            'Logged action partially',
            logErr?.message || 'Status was updated but the moderation log could not be saved.'
          );
        }
      }
      setPending((prev) => prev.filter((e) => e.id !== est.id));
      return true;
    } catch (e: any) {
      Alert.alert('Could not update', e?.message || 'Please try again.');
      return false;
    } finally {
      setActionLoadingId(null);
    }
  }

  function openLogModal(est: Establishment, action: 'approved' | 'rejected') {
    setLogModal({ visible: true, est, action, notes: '' });
  }

  async function submitModerationLog() {
    if (!logModal.est) return;
    const ok = await setStatus(logModal.est, logModal.action, logModal.notes);
    if (ok) {
      setLogModal({ visible: false, est: null, action: 'approved', notes: '' });
    }
  }

  function onApprove(est: Establishment) {
    Alert.alert(
      'Approve establishment?',
      `This will make "${est.name}" visible to users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'default', onPress: () => openLogModal(est, 'approved') },
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
          onPress: () => openLogModal(est, 'rejected'),
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
                          disabled={actionLoadingId === est.id}
                          className="px-4 py-2 rounded-full mr-3"
                          style={{ backgroundColor: VIOLET }}
                        >
                          <Text className="text-white text-[14px] font-semibold">Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => onReject(est)}
                          disabled={actionLoadingId === est.id}
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

      <Modal
        visible={logModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (actionLoadingId) return;
          setLogModal({ visible: false, est: null, action: 'approved', notes: '' });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <View className="flex-1 bg-black/40" />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-6">
            <Text className="text-[16px] font-extrabold text-gray-900">
              {logModal.action === 'approved' ? 'Approve establishment' : 'Reject establishment'}
            </Text>
            <Text className="text-[13px] text-gray-600 mt-1">
              Add moderation notes (optional). A log entry will be created.
            </Text>

            <TextInput
              placeholder="Notes for this decision"
              multiline
              value={logModal.notes}
              onChangeText={(t) => setLogModal((prev) => ({ ...prev, notes: t }))}
              className="mt-4 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] text-gray-900"
              placeholderTextColor="#9CA3AF"
              editable={!actionLoadingId}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />

            <View className="flex-row justify-end mt-4">
              <TouchableOpacity
                onPress={() =>
                  !actionLoadingId &&
                  setLogModal({ visible: false, est: null, action: 'approved', notes: '' })
                }
                className="px-4 py-2 mr-2 rounded-full bg-gray-100"
                disabled={!!actionLoadingId}
              >
                <Text className="text-[14px] font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitModerationLog}
                className="px-5 py-2 rounded-full"
                style={{ backgroundColor: VIOLET, opacity: actionLoadingId ? 0.7 : 1 }}
                disabled={!!actionLoadingId}
                activeOpacity={0.85}
              >
                {actionLoadingId ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">
                    {logModal.action === 'approved' ? 'Approve & Log' : 'Reject & Log'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
