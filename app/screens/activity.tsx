import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, Link, useRouter } from 'expo-router';
import { fetchActivityById } from '../../api/activities';
import { createBooking as createBookingApi, updateBooking } from '../../api/bookings';
import { resolveImageUrl } from '../../api/client';
import { useAuth } from '../../sessions/AuthContext'; // ★ use logged-in user here

/* ============================
   Types
============================ */
type ActivityImage = { id?: number; url: string; created_at?: string };
type Instructor = {
  id: number; name: string; bio?: string | null; email?: string | null; phone?: string | null;
  profile_picture?: string | null; profile_placeholder?: string | null; avatarUri?: string | null; image_url?: string | null;
};
type Schedule = {
  id: number; activity_id?: number; day_of_week: number; start_time: string; end_time?: string | null;
  capacity?: number | null; is_active: 1 | 0 | boolean;
};
type ActivityDetail = {
  id: number; establishment_id: number; title: string; description?: string | null;
  price?: number | null; images?: ActivityImage[]; instructors?: Instructor[]; schedules?: Schedule[];
};

/* ============================
   Accent color
============================ */
const ACTIVE_HEX = '#7C3AED';
const activeBgBr = { backgroundColor: ACTIVE_HEX, borderColor: ACTIVE_HEX };
const activeText = { color: ACTIVE_HEX };

/* ============================
   UI helpers
============================ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[20px] font-bold text-gray-900 mb-4">{children}</Text>;
}

function InstructorCard({ person }: { person: Instructor }) {
  const placeholder = require('../../assets/images/instructors/profile_placeholder.jpeg');
  const photo = person.profile_picture ? { uri: person.profile_picture } : placeholder;
  return (
    <View className="w-28 items-center mr-5">
      <View className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
        <Image source={photo} className="w-full h-full" />
      </View>
      <Text className="mt-2 text-[12px] font-semibold text-gray-900" numberOfLines={1}>
        {person.name}
      </Text>
    </View>
  );
}

/* ============================
   Helpers
============================ */
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
const formatBHD = (n?: number | null) => typeof n === 'number' && isFinite(n) ? `BHD ${n.toFixed(2)}` : '';
const to12h = (hhmmss: string) => { const [H,M] = hhmmss.split(':').map(v=>parseInt(v,10)); const h12=((H%12)||12).toString(); const ampm=H<12?'AM':'PM'; return `${h12}:${String(M).padStart(2,'0')} ${ampm}`; };
const normImageUrl = (img: any) => resolveImageUrl(img?.url ?? img?.image_url ?? img?.path ?? '');
const normInstructorPic = (m: any) => resolveImageUrl(m?.profile_picture ?? m?.profile_placeholder ?? m?.avatar ?? m?.image_url ?? '');

/* Client error → message */
function bookingErrorToMessage(err: any): string {
  const code = typeof err === 'string' ? err : err?.error || '';
  switch (code) {
    case 'duplicate_booking': return "You can’t book the same time twice.";
    case 'schedule_full_for_that_time': return 'Sorry, this time is fully booked.';
    case 'schedule_inactive': return 'This time is no longer available.';
    case 'time_mismatch_dayofweek':
    case 'time_mismatch_start_time': return 'Selected time does not match the schedule.';
    case 'activity_mismatch': return 'Selected time does not belong to this activity.';
    case 'invalid_schedule_id': return 'Invalid schedule.';
    default: return 'Something went wrong. Please try again.';
  }
}

/* ============================
   Image Carousel
============================ */
function ImageCarousel({ images }: { images: ActivityImage[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = (images || []).filter(Boolean);
  if (!list.length) return null;
  const height = Math.round((width * 9) / 16);

  return (
    <View>
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const w = e.nativeEvent.layoutMeasurement.width;
          if (w > 0) {
            const i = Math.round(e.nativeEvent.contentOffset.x / w);
            if (i !== index) setIndex(i);
          }
        }}
        scrollEventThrottle={16}
      >
        {list.map((img, i) => (
          <Image key={img.id ?? i} source={{ uri: img.url }} resizeMode="cover" style={{ width, height }} />
        ))}
      </ScrollView>

      {list.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
          {list.map((_, i) => (
            <View key={i} className={`mx-1 h-2 w-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </View>
      )}
    </View>
  );
}

/* ============================
   Screen
============================ */
export default function ActivityScreen() {
  const { id, title, rescheduleFrom } = useLocalSearchParams<{ id?: string; title?: string; rescheduleFrom?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, initializing } = useAuth(); // ★ get logged-in user

  const activityId = Number(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);

  // Booking state
  // ★ removed hard-coded userId; we’ll use user?.id below
  const [selectedDateKey, setSelectedDateKey] = useState<string>(''); // "YYYY-MM-DD"
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedTimeKey, setSelectedTimeKey] = useState<string>(''); // "YYYY-MM-DDTHH:MM"
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activityId) {
        setError('Missing activity id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActivityById(activityId);
        if (!data) throw new Error('Not found');
        if (cancelled) return;

        const normalized: ActivityDetail = {
          ...data,
          images: Array.isArray(data?.images)
            ? data.images.filter(Boolean).map((img: any) => ({ ...img, url: normImageUrl(img) }))
            : [],
          instructors: Array.isArray(data?.instructors)
            ? data.instructors.filter(Boolean).map((m: any) => ({
                ...m,
                profile_picture: m?.profile_picture || m?.profile_placeholder ? normInstructorPic(m) : null,
              }))
            : [],
          schedules: Array.isArray(data?.schedules) ? data.schedules : [],
        };

        setActivity(normalized);
        setSchedules(normalized.schedules || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [activityId]);

  const allSchedules = schedules || [];
  const activeSchedules = useMemo(() => allSchedules.filter((s) => Boolean(s.is_active)), [allSchedules]);

  const groupedWeekly = useMemo(() => {
    const byDay: Record<number, Schedule[]> = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
    allSchedules.forEach(s => byDay[s.day_of_week].push(s));
    (Object.keys(byDay) as unknown as number[]).forEach(d => {
      byDay[d].sort((a,b) => a.start_time.localeCompare(b.start_time));
    });
    return byDay;
  }, [allSchedules]);

  const dayChips = useMemo(() => {
    const out: { key: string; dow: number; d: number; dowLabel: string; month: string }[] = [];
    const base = new Date();
    base.setHours(0,0,0,0);
    for (let i=0;i<21;i++){
      const dt = new Date(base);
      dt.setDate(base.getDate()+i);
      const yyyy = dt.getFullYear(); const mm = String(dt.getMonth()+1).padStart(2,'0'); const dd = String(dt.getDate()).padStart(2,'0');
      out.push({ key:`${yyyy}-${mm}-${dd}`, dow: dt.getDay(), d: dt.getDate(), dowLabel: WEEKDAYS[dt.getDay()], month: MONTHS[dt.getMonth()] });
    }
    return out;
  }, []);

  useEffect(() => {
    if (selectedDateKey || !activeSchedules.length) return;
    const first = dayChips.find(c => activeSchedules.some(s => s.day_of_week === c.dow));
    if (first) setSelectedDateKey(first.key);
  }, [dayChips, activeSchedules, selectedDateKey]);

  const timeSlots = useMemo(() => {
    if (!selectedDateKey || !activeSchedules.length) return [] as { key: string; label: string; scheduleId: number }[];
    const [Y,M,D] = selectedDateKey.split('-').map(n => parseInt(n,10));
    const dt = new Date(Y, M-1, D);
    const dow = dt.getDay();
    return activeSchedules
      .filter(s => s.day_of_week === dow)
      .sort((a,b) => a.start_time.localeCompare(b.start_time))
      .map(s => {
        const hhmm = s.start_time.slice(0,5);
        return { key: `${selectedDateKey}T${hhmm}`, label: to12h(s.start_time), scheduleId: s.id };
      });
  }, [selectedDateKey, activeSchedules]);

  useEffect(() => {
    setSelectedTimeKey('');
    setSelectedScheduleId(null);
  }, [selectedDateKey]);

  async function onCreateBooking() {
    if (!activity) return;
    if (!selectedScheduleId || !selectedTimeKey) {
      Alert.alert('Select time', 'Please choose a date and time.');
      return;
    }
    // ★ Require signed-in user
    if (!user || !user.id) {
      Alert.alert('Sign in required', 'Please sign in to book this activity.');
      return;
    }

    setSubmitting(true);
    try {
      const booked_for = selectedTimeKey.replace('T',' ') + ':00';
      const payload = {
        user_id: user.id,            // ★ use logged-in user's id
        activity_id: activity.id,
        schedule_id: selectedScheduleId,
        booked_for,
        status: 'confirmed' as const,
      };

      const res = await createBookingApi(payload);

      if (res && !res.error && res.id) {
        if (rescheduleFrom) {
          try { await updateBooking(Number(rescheduleFrom), { status: 'cancelled' }); }
          catch { Alert.alert('Note', 'New time booked, but the old booking could not be cancelled automatically.'); }
        }
        Alert.alert('Booked ✅', `#${res.id} • ${activity.title}`);
        return;
      }

      const msg = bookingErrorToMessage(res);
      Alert.alert('Cannot book', msg);
    } catch {
      Alert.alert('Cannot book', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-3 text-gray-600">Loading activity...</Text>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-[16px] font-semibold text-gray-900">Oops</Text>
        <Text className="mt-2 text-[14px] text-gray-600 text-center">
          {error || 'Could not load activity'}
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity className="mt-5 px-4 py-2 rounded-full bg-white border border-gray-200">
            <Text className="text-[14px] font-semibold text-gray-900">Go Home</Text>
          </TouchableOpacity>
        </Link>
      </SafeAreaView>
    );
  }

  const monthLabel = (() => {
    if (!selectedDateKey) return '';
    const [Y,M] = selectedDateKey.split('-').map(n=>parseInt(n,10));
    return `${MONTHS[(M-1) as number]} ${Y}`;
  })();

  const canBook = !!user && !!user.id && !!selectedTimeKey && !!selectedScheduleId && !submitting;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Images */}
          <View>
            {activity.images && activity.images.length ? (
              <ImageCarousel images={activity.images} />
            ) : (
              <View className="w-full h-72 bg-gray-100 items-center justify-center">
                <Feather name="image" size={20} color="#9ca3af" />
                <Text className="mt-2 text-gray-400">No images yet</Text>
              </View>
            )}

            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              style={{ position: 'absolute', left: 16, top: insets.top + 8, zIndex: 10 }}
              className="w-9 h-9 rounded-full bg-white items-center justify-center border border-gray-200"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Title / price / description */}
          <View className="px-5 pt-5">
            <Text className="text-[24px] font-extrabold text-gray-900" numberOfLines={2}>
              {activity.title || title}
            </Text>
            {activity.description ? (
              <Text className="mt-3 text-[14px] leading-5 text-gray-800">{activity.description}</Text>
            ) : null}
          </View>

          {/* Weekly schedule */}
          <View className="px-5 mt-8">
            <SectionTitle>Weekly schedule</SectionTitle>
            {allSchedules.length ? (
              <View className="rounded-2xl border border-gray-200">
                {([0,1,2,3,4,5,6] as const)
                  .filter((d) => groupedWeekly[d].length)
                  .map((dow, idx, arr) => {
                    const rows = groupedWeekly[dow];
                    return (
                      <View key={dow}>
                        <View className="px-4 py-3">
                          <Text className="text-[14px] font-semibold text-gray-900">{WEEKDAYS[dow]}</Text>
                          <View className="mt-1">
                            {rows.map((s) => {
                              const inactive = !Boolean(s.is_active);
                              return (
                                <Text key={s.id} className={`text-[13px] ${inactive ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {s.start_time.slice(0,5)}{s.end_time ? ` – ${s.end_time.slice(0,5)}` : ''}{s.capacity != null ? `   cap ${s.capacity}` : ''}
                                </Text>
                              );
                            })}
                          </View>
                        </View>
                        {idx < arr.length - 1 && <View className="h-px bg-gray-200" />}
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Text className="text-[14px] text-gray-600">No recurring schedule published.</Text>
            )}
          </View>

          {/* Instructors */}
          <View className="px-5 mt-10">
            <SectionTitle>Instructors</SectionTitle>
            {activity.instructors && activity.instructors.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
                {activity.instructors.map((m) => (<InstructorCard key={m.id} person={m} />))}
              </ScrollView>
            ) : (
              <Text className="text-[14px] text-gray-600">No instructors listed.</Text>
            )}
          </View>

          {/* Booking section */}
          <View className="px-5 mt-10 mb-8">
            <SectionTitle>Select time</SectionTitle>

            {selectedDateKey ? <Text className="text-[13px] text-gray-600 mb-3">{monthLabel}</Text> : null}

            {/* Day chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
              {dayChips.map((c) => {
                const active = selectedDateKey === c.key;
                return (
                  <TouchableOpacity key={c.key} onPress={() => setSelectedDateKey(c.key)} activeOpacity={0.8} className="mr-3 items-center">
                    <View className="w-14 h-14 rounded-full border items-center justify-center" style={active ? activeBgBr : undefined}>
                      <Text className={`text-[16px] font-semibold ${active ? 'text-white' : 'text-gray-900'}`}>{c.d}</Text>
                    </View>
                    <Text className="mt-1 text-[12px]" style={active ? activeText : undefined}>{c.dowLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time slots */}
            <View className="mt-5">
              {selectedDateKey && timeSlots.length ? (
                timeSlots.map((slot) => {
                  const isSelected = selectedTimeKey === slot.key && selectedScheduleId === slot.scheduleId;
                  return (
                    <TouchableOpacity
                      key={slot.key}
                      onPress={() => { setSelectedTimeKey(slot.key); setSelectedScheduleId(slot.scheduleId); }}
                      activeOpacity={0.8}
                      className="mb-3 rounded-2xl border px-4 py-4 bg-white border-gray-300"
                      style={isSelected ? activeBgBr : undefined}
                    >
                      <Text className={`text-[15px] font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : selectedDateKey ? (
                <Text className="text-[13px] text-gray-600">No times for this day.</Text>
              ) : (
                <Text className="text-[13px] text-gray-600">Pick a day to see times.</Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={onCreateBooking}
              disabled={!canBook}
              activeOpacity={0.85}
              className="mt-6 px-5 py-3 rounded-full"
              style={
                !canBook
                  ? { backgroundColor: '#D1D5DB' }
                  : { backgroundColor: ACTIVE_HEX }
              }
            >
              <Text className="text-white text-center text-[15px] font-semibold">
                {submitting ? 'Booking...' : (!user || !user.id ? 'Sign in to book' : 'Book now')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
