import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchActivityById } from '../../api/activities';
import { fetchBookings, updateBooking } from '../../api/bookings';
import { resolveImageUrl } from '../../api/client';
import { useAuth } from '../../sessions/AuthContext';

type RawStatus = 'confirmed' | 'expired' | 'canceled' | 'cancelled';
type Booking = {
  id: number;
  user_id: number;
  activity_id: number;
  schedule_id?: number | null;
  people_count: number;
  booked_for: string | null;
  status: RawStatus;
};
type Activity = { id: number; title: string; images?: { id?: number; url: string }[] };

const VIOLET = '#7C3AED';

function parseDate(dt?: string | null) {
  if (!dt) return null;
  const d = new Date(dt.includes('T') ? dt : dt.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
function formatDateTime(dt?: string | null) {
  const d = parseDate(dt);
  if (!d) return 'No time';
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  };
  return d.toLocaleString(undefined, opts);
}
function isFuture(dt?: string | null) {
  const d = parseDate(dt);
  return !!d && d.getTime() > Date.now();
}
function inHowLong(dt?: string | null) {
  const d = parseDate(dt);
  if (!d) return '';
  const ms = d.getTime() - Date.now();
  const diffDays = Math.round(ms / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '';
  return diffDays === 1 ? 'In 1 day' : `In ${diffDays} days`;
}
function normalizeStatus(s: RawStatus): 'confirmed' | 'expired' | 'cancelled' {
  if (s === 'canceled') return 'cancelled';
  if (s === 'expired') return 'expired';
  return s === 'confirmed' ? 'confirmed' : 'cancelled';
}

export default function BookingScreen() {
  const router = useRouter();

  const { user, initializing } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<Record<number, Activity>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      // require a logged in user
      if (!user || !user.id) {
        setBookings([]);
        setActivities({});
        return;
      }

      const rows = await fetchBookings({ user_id: user.id });
      const list: Booking[] = Array.isArray(rows) ? rows : [];
      setBookings(list);

      const missingIds = [...new Set(list.map(b => b.activity_id))].filter(id => !activities[id]);
      if (missingIds.length) {
        const updates: Record<number, Activity> = {};
        await Promise.all(
          missingIds.map(async (id) => {
            const a = await fetchActivityById(id);
            if (a) {
              updates[id] = {
                id: a.id,
                title: a.title,
                images: Array.isArray(a.images)
                  ? a.images.map((img: any) => ({ ...img, url: resolveImageUrl(img.url) }))
                  : [],
              };
            }
          })
        );
        setActivities(prev => ({ ...prev, ...updates }));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // load bookings once auth has been resolved and when user changes
    if (initializing) return; // wait for auth restore
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initializing]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(b => normalizeStatus(b.status) === 'confirmed' && isFuture(b.booked_for))
        .sort((a, b) => (a.booked_for || '').localeCompare(b.booked_for || '')),
    [bookings]
  );

  const past = useMemo(
    () =>
      bookings
        .filter(b => {
          const s = normalizeStatus(b.status);
          return s === 'cancelled' || s === 'expired';
        })
        .sort((a, b) => (b.booked_for || '').localeCompare(a.booked_for || '')),
    [bookings]
  );

  async function cancelBooking(booking: Booking, silent = false) {
    // optimistic UI
    const snapshot = bookings;
    setBookings(prev => prev.map(b => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)));

    const res = await updateBooking(booking.id, { status: 'cancelled' });
    if (!res || res.error) {
      // revert and show friendly message
      setBookings(snapshot);
      if (!silent) Alert.alert('Could not cancel', 'Please try again.');
      return false;
    }

    // refresh from server so lists (Upcoming/Past) reflect final truth
    await load();
    return true;
  }

  function onCancel(booking: Booking) {
    Alert.alert('Cancel booking?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: () => cancelBooking(booking),
      },
    ]);
  }

  function onReschedule(booking: Booking) {
    router.push({
      pathname: '/screens/activity',
      params: {
        id: String(booking.activity_id),
        rescheduleFrom: String(booking.id),
      },
    });
  }

  function UpcomingCard({ b }: { b: Booking }) {
    const act = activities[b.activity_id];
    const cover = act?.images?.[0]?.url ? { uri: act.images[0].url } : undefined;
    const hint = inHowLong(b.booked_for);

    const goToActivity = () => {
      router.push({
        pathname: '/screens/activity',
        params: { id: String(b.activity_id) },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={goToActivity}
        className="mb-4 rounded-2xl overflow-hidden border border-gray-200 bg-white"
      >
        <View className="w-full h-40 bg-gray-100">
          {cover ? (
            <Image source={cover} className="w-full h-full" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-400">No image</Text>
            </View>
          )}
          {!!hint && (
            <View
              style={{ position: 'absolute', left: 12, top: 12, backgroundColor: `${VIOLET}E6` }}
              className="px-2 py-1 rounded-full"
            >
              <Text className="text-white text-[12px] font-semibold">{hint}</Text>
            </View>
          )}
        </View>

        <View className="px-4 py-4">
          <Text className="text-[18px] font-extrabold text-gray-900" numberOfLines={2}>
            {act?.title || 'Activity'}
          </Text>
          <Text className="mt-1 text-[13px] text-gray-700">{formatDateTime(b.booked_for)}</Text>

          <View className="mt-4 flex-row">
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); 
                onReschedule(b);
              }}
              activeOpacity={0.85}
              className="px-4 py-2 rounded-full border mr-3"
              style={{ borderColor: VIOLET }}
            >
              <Text style={{ color: VIOLET }} className="text-[14px] font-semibold">
                Reschedule
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); 
                onCancel(b);
              }}
              activeOpacity={0.85}
              className="px-4 py-2 rounded-full border border-gray-300"
            >
              <Text className="text-[14px] font-semibold text-gray-900">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function PastRow({ b }: { b: Booking }) {
    const act = activities[b.activity_id];
    const thumb = act?.images?.[0]?.url ? { uri: act.images[0].url } : undefined;
    const uiStatus = normalizeStatus(b.status);
    const chipBg = uiStatus === 'cancelled' ? '#FEE2E2' : '#E5E7EB';
    const chipText = uiStatus === 'cancelled' ? '#B91C1C' : '#4B5563';

    return (
      <View className="flex-row items-center py-3">
        <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 mr-3">
          {thumb ? <Image source={thumb} className="w-full h-full" /> : null}
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-gray-900" numberOfLines={1}>
            {act?.title || 'Activity'}
          </Text>
          <Text className="text-[13px] text-gray-600" numberOfLines={1}>
            {formatDateTime(b.booked_for)}
          </Text>
        </View>
        <View className="px-2 py-[2px] rounded-full ml-2" style={{ backgroundColor: chipBg }}>
          <Text className="text-[12px] font-semibold" style={{ color: chipText }}>
            {uiStatus}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator />
        <Text className="mt-3 text-gray-600">Loading your bookings...</Text>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6" edges={['top']}>
        <Text className="text-[16px] font-semibold text-gray-900">Oops</Text>
        <Text className="mt-2 text-[14px] text-gray-600 text-center">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
          <View className="px-5 pt-4">
            <Text className="text-[28px] font-extrabold text-gray-900">Appointments</Text>
          </View>

          {/* Upcoming */}
          <View className="px-5 mt-6">
            <View className="flex-row items-center">
              <Text className="text-[20px] font-bold text-gray-900">Upcoming</Text>
              {upcoming.length > 0 && (
                <View className="ml-2 px-2 py-[2px] rounded-full" style={{ backgroundColor: `${VIOLET}1A` }}>
                  <Text style={{ color: VIOLET }} className="text-[12px] font-bold">
                    {upcoming.length}
                  </Text>
                </View>
              )}
            </View>

            {upcoming.length === 0 ? (
              <View className="mt-4 rounded-2xl border border-gray-200 p-6 items-center">
                <View className="w-14 h-14 rounded-2xl mb-3" style={{ backgroundColor: `${VIOLET}1A` }} />
                <Text className="text-[18px] font-bold text-gray-900 text-center">No upcoming appointments</Text>
                <Text className="mt-1 text-[13px] text-gray-600 text-center">
                  Your upcoming appointments will appear when you book
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {upcoming.map(b => (
                  <UpcomingCard key={b.id} b={b} />
                ))}
              </View>
            )}
          </View>

          {/* Past */}
          <View className="px-5 mt-10">
            <Text className="text-[20px] font-bold text-gray-900">Past</Text>
            {past.length === 0 ? (
              <Text className="mt-3 text-[13px] text-gray-600">No past bookings.</Text>
            ) : (
              <View className="mt-2">
                {past.map(b => (
                  <PastRow key={b.id} b={b} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
