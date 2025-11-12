// app/screens/pending_establisment.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  resolveImageUrl,
  fetchEstablishmentById,
  fetchActivities,
  fetchInstructors,
  fetchSchedulesByActivity,
  updateEstablishment,
} from '../../api';


const VIOLET = '#7C3AED';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type Establishment = {
  id: number;
  owner_user_id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  image_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

type Activity = {
  id: number;
  establishment_id: number;
  title: string;
  description?: string | null;
  price?: number | null;
};

type ActivitySchedule = {
  id: number;
  activity_id: number;
  day_of_week: number; // 0..6
  start_time: string;  // "HH:MM:SS"
  end_time?: string | null;
  is_active: 0 | 1 | boolean;
};

type Instructor = {
  id: number;
  establishment_id: number;
  name: string;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_picture?: string | null;
};

function to12h(hhmmss: string) {
  const [H, M] = hhmmss.split(':').map((v) => parseInt(v, 10));
  const h12 = ((H % 12) || 12).toString();
  const ampm = H < 12 ? 'AM' : 'PM';
  return `${h12}:${String(M).padStart(2, '0')} ${ampm}`;
}

export default function PendingEstablishmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const estId = Number(id);

  const [loading, setLoading] = useState(true);
  const [est, setEst] = useState<Establishment | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedulesByActivity, setSchedulesByActivity] = useState<Record<number, ActivitySchedule[]>>({});
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!estId) return;
    setLoading(true);
    setError(null);
    try {
      // 1) base establishment
      const estData = await fetchEstablishmentById(estId);
      if (!estData) throw new Error('Not found');
      setEst(estData);

      // 2) activities for this establishment
      const acts = await fetchActivities(estId);
      setActivities(acts);

      // 3) schedules — we only have fetchSchedulesByActivity(activityId),
      // so fetch them in parallel for all activities
      const schedMap: Record<number, ActivitySchedule[]> = {};
      await Promise.all(
        acts.map(async (a) => {
          const scheds = await fetchSchedulesByActivity(a.id);
          schedMap[a.id] = Array.isArray(scheds) ? scheds : [];
        })
      );
      setSchedulesByActivity(schedMap);

      // 4) instructors for this establishment
      const insts = await fetchInstructors({ establishment_id: estId });
      setInstructors(insts);
    } catch (e: any) {
      setError(e?.message || 'Failed to load establishment');
    } finally {
      setLoading(false);
    }
  }, [estId]);

  useEffect(() => {
    load();
  }, [load]);

  const coverImage = est?.image_url ? resolveImageUrl(est.image_url) : null;

  const activitiesWithSchedules = useMemo(() => {
    return activities.map((a) => ({
      ...a,
      slots: schedulesByActivity[a.id] ?? [],
    }));
  }, [activities, schedulesByActivity]);

  function openMaps() {
    if (!est?.lat || !est?.lng) return;
    const url = `https://www.google.com/maps?q=${est.lat},${est.lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot open maps');
    });
  }

  async function approve() {
    if (!est) return;
    const res = await updateEstablishment(est.id, { status: 'approved' });
    if (res && !res.error) {
      Alert.alert('Approved ✅', `"${est.name}" is now visible to users.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Could not approve', res?.message || 'Please try again.');
    }
  }

  async function reject() {
    if (!est) return;
    const res = await updateEstablishment(est.id, { status: 'rejected' });
    if (res && !res.error) {
      Alert.alert('Rejected', `"${est.name}" was rejected.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Could not reject', res?.message || 'Please try again.');
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-3 text-gray-600">Loading establishment…</Text>
        </SafeAreaView>
      </>
    );
  }

  if (error || !est) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-[16px] font-semibold text-gray-900">Oops</Text>
          <Text className="mt-2 text-[14px] text-gray-600 text-center">
            {error || 'Not found'}
          </Text>
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
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Cover */}
          <View className="w-full h-56 bg-gray-100">
            {coverImage ? (
              <Image source={{ uri: coverImage }} className="w-full h-full" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Feather name="image" size={22} color="#9CA3AF" />
                <Text className="mt-2 text-gray-400 text-[12px]">No image</Text>
              </View>
            )}

            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{ position: 'absolute', top: insets.top + 10, left: 16 }}
              className="w-9 h-9 rounded-full bg-white items-center justify-center border border-gray-200"
            >
              <Feather name="arrow-left" size={18} color="#000" />
            </TouchableOpacity>

            {/* Status */}
            <View
              style={{ position: 'absolute', top: insets.top + 10, right: 16, backgroundColor: '#F97316' }}
              className="px-3 py-[4px] rounded-full"
            >
              <Text className="text-white text-[12px] font-semibold uppercase">Pending</Text>
            </View>
          </View>

          {/* Title */}
          <View className="px-5 pt-5">
            <Text className="text-[24px] font-extrabold text-gray-900" numberOfLines={2}>
              {est.name}
            </Text>
            {est.category ? (
              <Text className="mt-1 text-[13px] text-gray-500">{est.category}</Text>
            ) : null}
          </View>

          {/* Location + description under it */}
          <View className="px-5 mt-6">
            <View className="rounded-2xl border border-gray-200 bg-white p-4 flex-row">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${VIOLET}1A` }}
              >
                <Feather name="map-pin" size={18} color={VIOLET} />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-gray-900">Location</Text>
                <Text className="text-[13px] text-gray-600 mt-1">
                  {est.address || 'No address provided'}
                </Text>
                {/* Description is here (under location, above contacts) */}
                {est.description ? (
                  <Text className="text-[13px] text-gray-700 mt-3">
                    {est.description}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Contacts (with Open in Maps) */}
          <View className="px-5 mt-5">
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${VIOLET}1A` }}
                  >
                    <Feather name="phone-call" size={18} color={VIOLET} />
                  </View>
                  <Text className="text-[14px] font-semibold text-gray-900">Contact</Text>
                </View>
              </View>

              {est.phone ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(`tel:${est.phone}`)}
                  className="flex-row items-center mb-2"
                >
                  <Feather name="phone" size={15} color="#4B5563" />
                  <Text className="ml-2 text-[13px] text-gray-700">{est.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {est.email ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(`mailto:${est.email}`)}
                  className="flex-row items-center mb-2"
                >
                  <Feather name="mail" size={15} color="#4B5563" />
                  <Text className="ml-2 text-[13px] text-gray-700">{est.email}</Text>
                </TouchableOpacity>
              ) : null}

              {est.lat && est.lng ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openMaps}
                  className="mt-3 px-4 py-2 rounded-full flex-row items-center"
                  style={{ backgroundColor: `${VIOLET}1A` }}
                >
                  <Feather name="map" size={16} color={VIOLET} />
                  <Text className="ml-2 text-[13px] font-semibold" style={{ color: VIOLET }}>
                    Open in Maps
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Activities bubble */}
          <View className="px-5 mt-6">
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${VIOLET}1A` }}
                >
                  <Feather name="activity" size={18} color={VIOLET} />
                </View>
                <Text className="text-[14px] font-semibold text-gray-900">
                  Activities ({activitiesWithSchedules.length})
                </Text>
              </View>

              {activitiesWithSchedules.length === 0 ? (
                <Text className="text-[13px] text-gray-500">
                  No activities for this establishment.
                </Text>
              ) : (
                activitiesWithSchedules.map((a) => (
                  <View key={a.id} className="mb-3">
                    <Text className="text-[13px] font-semibold text-gray-900">
                      {a.title}
                    </Text>
                    {a.slots && a.slots.length ? (
                      <View className="mt-1">
                        {a.slots.map((s) => (
                          <Text key={s.id} className="text-[12px] text-gray-600">
                            {DAY_LABELS[s.day_of_week]} • {to12h(s.start_time)}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-[12px] text-gray-400">No schedule</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Instructors bubble */}
          <View className="px-5 mt-6">
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${VIOLET}1A` }}
                >
                  <Feather name="users" size={18} color={VIOLET} />
                </View>
                <Text className="text-[14px] font-semibold text-gray-900">
                  Instructors ({instructors.length})
                </Text>
              </View>

              {instructors.length === 0 ? (
                <Text className="text-[13px] text-gray-500">
                  No instructors for this establishment.
                </Text>
              ) : (
                instructors.map((ins) => {
                  const avatar = ins.profile_picture
                    ? { uri: resolveImageUrl(ins.profile_picture) }
                    : require('../../assets/images/instructors/profile_placeholder.jpeg');
                  return (
                    <View key={ins.id} className="flex-row items-center mb-3">
                      <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-3">
                        <Image source={avatar} className="w-full h-full" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold text-gray-900">
                          {ins.name}
                        </Text>
                        {ins.email ? (
                          <Text className="text-[11px] text-gray-500">{ins.email}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Actions */}
          <View className="px-5 mt-8 mb-4 flex-row">
            <TouchableOpacity
              onPress={approve}
              activeOpacity={0.85}
              className="flex-1 px-4 py-3 rounded-full mr-3"
              style={{ backgroundColor: VIOLET }}
            >
              <Text className="text-white text-center text-[14px] font-semibold">
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={reject}
              activeOpacity={0.85}
              className="flex-1 px-4 py-3 rounded-full border border-red-200"
            >
              <Text className="text-red-500 text-center text-[14px] font-semibold">
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
