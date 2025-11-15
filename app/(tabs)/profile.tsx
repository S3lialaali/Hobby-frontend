import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../sessions/AuthContext';
import { fetchBookings } from '../../api/bookings';
import { fetchUserReviews, reportProblem, fetchUserReports } from '../../api/users';

const VIOLET = '#7C3AED';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[20px] font-bold text-gray-900 mb-4">{children}</Text>;
}

function Row({
  icon,
  label,
  onPress,
  value,
  danger = false,
  rightIcon,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
  rightIcon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="flex-row items-center justify-between py-4"
    >
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: `${VIOLET}1A` }}
        >
          {icon}
        </View>
        <Text
          className={`text-[15px] ${
            danger ? 'text-red-600 font-semibold' : 'text-gray-900 font-medium'
          }`}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        {value ? <Text className="text-[13px] text-gray-500 mr-2">{value}</Text> : null}
        {rightIcon
          ? rightIcon
          : !danger && <Feather name="chevron-right" size={18} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );
}

type Booking = {
  id: number;
  booked_for: string;
  status: 'confirmed' | 'expired' | 'canceled' | 'cancelled';
};

type Review = {
  id: number;
  establishment_id: number;
  establishment_name?: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
};

type UserReport = {
  id: number;
  user_id: number | null;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, initializing, loading, signOut } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showRatings, setShowRatings] = useState(false);

  // Report a problem state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // My reports state
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Fetch user bookings to compute counts
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setBookingsLoading(true);
      try {
        const list: Booking[] = await fetchBookings({ user_id: user.id });
        if (!cancelled) setBookings(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const now = Date.now();
  const { upcomingCount, pastCount } = useMemo(() => {
    let up = 0,
      pa = 0;
    for (const b of bookings) {
      const t = new Date(b.booked_for).getTime();
      const isPastTime = Number.isNaN(t) ? false : t < now;
      const status = String(b.status || '').toLowerCase();
      const isInactive = status === 'canceled' || status === 'cancelled' || status === 'expired';
      if (isPastTime || isInactive) pa++;
      else up++;
    }
    return { upcomingCount: up, pastCount: pa };
  }, [bookings, now]);

  const handleToggleRatings = async () => {
    if (!user?.id) return;
    const next = !showRatings;
    setShowRatings(next);
    if (next && reviews.length === 0) {
      setReviewsLoading(true);
      try {
        const list: Review[] = await fetchUserReviews(user.id);
        setReviews(Array.isArray(list) ? list : []);
      } finally {
        setReviewsLoading(false);
      }
    }
  };

  const handleToggleReports = async () => {
    if (!user?.id) return;
    const next = !showReports;
    setShowReports(next);
    if (next && reports.length === 0) {
      setReportsLoading(true);
      try {
        const list: UserReport[] = await fetchUserReports(user.id);
        setReports(Array.isArray(list) ? list : []);
      } finally {
        setReportsLoading(false);
      }
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatStatus = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'in_progress') return 'In progress';
    if (v === 'resolved') return 'Resolved';
    return 'Pending';
  };

  if (initializing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <Text className="text-gray-500">Loading profile…</Text>
        </SafeAreaView>
      </>
    );
  }

  // Not signed in → CTA only
  if (!user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-[18px] font-bold text-gray-900 mb-2">You’re not signed in</Text>
          <TouchableOpacity
            onPress={() => router.push('/screens/login')}
            className="px-5 py-3 rounded-2xl"
            style={{ backgroundColor: VIOLET }}
          >
            <Text className="text-white font-semibold">Go to Login</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  const displayName = user.name || user.fullName || user.username || 'User';
  const username = user.username || user.handle || (user.email ? user.email.split('@')[0] : '—');
  const email = user.email || '—';
  const avatarUrl: string | null = user.avatar || user.photoUrl || null;
  const avatarSource = avatarUrl
    ? { uri: avatarUrl }
    : require('../../assets/images/instructors/profile_placeholder.jpeg');

  const handleSubmitReport = async () => {
    if (!user?.id) {
      router.push('/screens/login');
      return;
    }
    const message = reportText.trim();
    if (!message) return;

    setReportSubmitting(true);
    try {
      await reportProblem({ user_id: user.id, message });
      setReportText('');
      setShowReportForm(false);

      // show a confirmation message
      Alert.alert('Report submitted', 'Thank you for your feedback. We’ll review it soon.');

      // optional: refresh "My reports" if it's open
      if (showReports) {
        setReportsLoading(true);
        const list: UserReport[] = await fetchUserReports(user.id);
        setReports(Array.isArray(list) ? list : []);
        setReportsLoading(false);
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <SafeAreaView className="flex-1 bg-white">
          <ScrollView
            contentContainerStyle={{ paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="px-5 pt-4">
              <Text className="text-[28px] font-extrabold text-gray-900">Profile</Text>
            </View>

            {/* Profile Card */}
            <View className="px-5 mt-6">
              <View className="rounded-2xl border border-gray-200 bg-white p-5">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 mr-4">
                    <Image source={avatarSource} className="w-full h-full" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[18px] font-extrabold text-gray-900" numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text className="text-[13px] text-gray-600" numberOfLines={1}>
                      @{username}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    className="px-3 py-2 rounded-full border"
                    style={{ borderColor: VIOLET }}
                    onPress={() => {
                      // router.push('/(user)/edit-profile');
                    }}
                  >
                    <Text className="text-[13px] font-semibold" style={{ color: VIOLET }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick stats: counts only */}
                <View className="mt-5 flex-row">
                  <View className="flex-1 items-center">
                    <Text className="text-[18px] font-extrabold text-gray-900">
                      {bookingsLoading ? '—' : upcomingCount}
                    </Text>
                    <Text className="text-[12px] text-gray-500">Upcoming</Text>
                  </View>
                  <View className="w-px bg-gray-200 mx-4" />
                  <View className="flex-1 items-center">
                    <Text className="text-[18px] font-extrabold text-gray-900">
                      {bookingsLoading ? '—' : pastCount}
                    </Text>
                    <Text className="text-[12px] text-gray-500">Past</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Account */}
            <View className="px-5 mt-10">
              <SectionTitle>Account</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                <Row
                  icon={<Feather name="at-sign" size={18} color={VIOLET} />}
                  label="Username"
                  value={username}
                  onPress={() => {}}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="mail" size={18} color={VIOLET} />}
                  label="Email"
                  value={email}
                  onPress={() => {}}
                />
              </View>
            </View>

            {/* Activity / Actions */}
            <View className="px-5 mt-10">
              <SectionTitle>Activity</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                {/* 1. Find activities */}
                <Row
                  icon={<Feather name="search" size={18} color={VIOLET} />}
                  label="Find activities"
                  onPress={() => router.push('/(tabs)/search')}
                />
                <View className="h-px bg-gray-200" />

                {/* 2. My bookings */}
                <Row
                  icon={<Feather name="calendar" size={18} color={VIOLET} />}
                  label="My bookings"
                  onPress={() => router.push('/(tabs)/booking')}
                />
                <View className="h-px bg-gray-200" />

                {/* 3. My ratings (dropdown) */}
                <Row
                  icon={<Feather name="star" size={18} color={VIOLET} />}
                  label="My ratings"
                  onPress={handleToggleRatings}
                  value={reviews.length ? `${reviews.length}` : undefined}
                  rightIcon={
                    <Feather
                      name={showRatings ? 'chevron-down' : 'chevron-right'}
                      size={18}
                      color="#9CA3AF"
                    />
                  }
                />

                {/* Ratings list directly under the button */}
                {showRatings && (
                  <>
                    <View className="h-px bg-gray-200" />
                    <View className="py-2">
                      {reviewsLoading ? (
                        <View className="py-4 items-center">
                          <ActivityIndicator />
                          <Text className="text-[12px] text-gray-500 mt-2">Loading…</Text>
                        </View>
                      ) : reviews.length === 0 ? (
                        <View className="py-2">
                          <Text className="text-[13px] text-gray-500">
                            You haven’t rated any establishments yet.
                          </Text>
                        </View>
                      ) : (
                        reviews.slice(0, 10).map((rv, idx) => {
                          const title = rv.establishment_name || 'Establishment';
                          const dateLabel = formatDate(rv.created_at);
                          const isLast = idx === Math.min(10, reviews.length) - 1;

                          return (
                            <View key={rv.id} className="py-2">
                              <View className="flex-row justify-between items-start">
                                <View className="flex-1 pr-2">
                                  <Text
                                    className="text-[14px] font-semibold text-gray-900"
                                    numberOfLines={1}
                                  >
                                    {title}
                                  </Text>
                                  {dateLabel ? (
                                    <Text className="text-[11px] text-gray-500">
                                      {dateLabel}
                                    </Text>
                                  ) : null}
                                </View>
                                <View className="flex-row">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <FontAwesome
                                      key={n}
                                      name={n <= (rv.rating || 0) ? 'star' : 'star-o'}
                                      size={12}
                                      color="#111"
                                    />
                                  ))}
                                </View>
                              </View>
                              {rv.comment ? (
                                <Text className="mt-1 text-[13px] text-gray-700">
                                  {rv.comment}
                                </Text>
                              ) : null}
                              {!isLast && <View className="h-px bg-gray-200 mt-3" />}
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Support / Danger */}
            <View className="px-5 mt-10">
              <SectionTitle>Support</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                {/* Report a problem row (toggles form) */}
                <Row
                  icon={<Feather name="alert-triangle" size={18} color={VIOLET} />}
                  label="Report a problem"
                  onPress={() => setShowReportForm((v) => !v)}
                  rightIcon={
                    <Feather
                      name={showReportForm ? 'chevron-down' : 'chevron-right'}
                      size={18}
                      color="#9CA3AF"
                    />
                  }
                />

                {showReportForm && (
                  <View className="pb-4">
                    <Text className="text-[13px] text-gray-600 mb-2">
                      Tell us what went wrong. We’ll review your report.
                    </Text>
                    <TextInput
                      value={reportText}
                      onChangeText={setReportText}
                      placeholder="Describe the issue…"
                      placeholderTextColor="rgba(60,60,67,0.6)"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      className="border rounded-xl px-4 py-3"
                    />
                    <View className="flex-row mt-3">
                      <TouchableOpacity
                        disabled={reportSubmitting || !reportText.trim()}
                        onPress={handleSubmitReport}
                        className="px-4 py-2 rounded-full mr-3"
                        style={{
                          backgroundColor:
                            reportSubmitting || !reportText.trim() ? '#E5E7EB' : '#111',
                        }}
                        activeOpacity={0.85}
                      >
                        {reportSubmitting ? (
                          <ActivityIndicator />
                        ) : (
                          <Text className="text-white font-semibold">Submit</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setShowReportForm(false);
                          setReportText('');
                        }}
                        className="px-4 py-2 rounded-full border border-gray-300 bg-white"
                        activeOpacity={0.85}
                      >
                        <Text className="text-[13px] font-medium text-gray-900">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="h-px bg-gray-200" />

                {/* My Reports row with dropdown, like My ratings */}
                <Row
                  icon={<Feather name="help-circle" size={18} color={VIOLET} />}
                  label="My reports"
                  onPress={handleToggleReports}
                  value={reports.length ? `${reports.length}` : undefined}
                  rightIcon={
                    <Feather
                      name={showReports ? 'chevron-down' : 'chevron-right'}
                      size={18}
                      color="#9CA3AF"
                    />
                  }
                />

                {showReports && (
                  <View className="pb-4">
                    {reportsLoading ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator />
                        <Text className="text-[12px] text-gray-500 mt-2">Loading…</Text>
                      </View>
                    ) : reports.length === 0 ? (
                      <View className="py-2">
                        <Text className="text-[13px] text-gray-500">
                          You haven’t submitted any reports yet.
                        </Text>
                      </View>
                    ) : (
                      reports.slice(0, 10).map((rep, idx) => {
                        const dateLabel = formatDate(rep.created_at);
                        const isLast = idx === Math.min(10, reports.length) - 1;
                        const statusLabel = formatStatus(rep.status);
                        const statusColor =
                          rep.status === 'resolved'
                            ? '#16A34A'
                            : rep.status === 'in_progress'
                            ? '#F97316'
                            : '#DC2626';

                        return (
                          <View key={rep.id} className="py-2">
                            <View className="flex-row justify-between items-start">
                              <View className="flex-1 pr-2">
                                {dateLabel ? (
                                  <Text className="text-[11px] text-gray-500 mb-1">
                                    {dateLabel}
                                  </Text>
                                ) : null}
                                <Text className="text-[13px] text-gray-800">
                                  {rep.message}
                                </Text>
                              </View>
                              <View
                                className="ml-2 px-2 py-1 rounded-full"
                                style={{ backgroundColor: `${statusColor}1A` }}
                              >
                                <Text
                                  className="text-[11px] font-semibold"
                                  style={{ color: statusColor }}
                                >
                                  {statusLabel}
                                </Text>
                              </View>
                            </View>
                            {!isLast && <View className="h-px bg-gray-200 mt-3" />}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>

              <View className="mt-4 rounded-2xl border border-gray-200 bg-white px-4">
                <Row
                  icon={<Feather name="log-out" size={18} color="#DC2626" />}
                  label={loading ? 'Logging out…' : 'Log out'}
                  danger
                  onPress={() => {
                    if (!loading) signOut();
                  }}
                />
              </View>
            </View>

            {/* Version footer */}
            <View className="px-5 mt-10 items-center opacity-60">
              <Text className="text-[12px] text-gray-500">App v1.0.0</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}
