// app/(establishment)/dashboard.tsx
// Establishment dashboard that shows high-level stats for the business owner

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchActivities } from "@/api/activities";
import { fetchInstructors } from "@/api/instructors";
import { fetchBookings } from "@/api/bookings";

const VIOLET = "#7C3AED";

type Establishment = {
  id: number;
  name: string;
  status: string;
  activity_count?: number | null;
  instructor_count?: number | null;
};

type Activity = {
  id: number;
  establishment_id: number;
};

type Instructor = {
  id: number;
  establishment_id: number;
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
      className="w-full rounded-2xl px-4 py-3 mb-4 border bg-white"
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

export default function EstablishmentDashboard() {
  const { id: userId } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [instructorCount, setInstructorCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setError("You must be logged in as a business user.");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1) Load the establishment owned by this user
      const estList = await fetchEstablishments({ owner_user_id: userId });
      const est = Array.isArray(estList) ? (estList[0] as Establishment | undefined) : undefined;

      if (!est || !est.id) {
        setEstablishment(null);
        setActivityCount(0);
        setInstructorCount(0);
        setBookingsCount(0);
        setError("No establishment yet. Create one to see your dashboard.");
        return;
      }

      setEstablishment(est);

      // 2) Load activities + instructors in parallel
      const [activitiesRaw, instructorsRaw] = await Promise.all([
        fetchActivities({ establishment_id: est.id }),
        fetchInstructors({ establishment_id: est.id }),
      ]);

      const activities: Activity[] = Array.isArray(activitiesRaw)
        ? (activitiesRaw as Activity[])
        : [];
      const instructors: Instructor[] = Array.isArray(instructorsRaw)
        ? (instructorsRaw as Instructor[])
        : [];

      // For counts, prefer actual lists. If you want to rely on
      // est.activity_count / est.instructor_count you can swap these.
      setActivityCount(activities.length);
      setInstructorCount(instructors.length);

      // 3) Total bookings: sum bookings for each activity
      if (!activities.length) {
        setBookingsCount(0);
      } else {
        const bookingsArrays = await Promise.all(
          activities.map((act) => fetchBookings({ activity_id: act.id }))
        );

        const total = bookingsArrays.reduce((sum, arr) => {
          if (!Array.isArray(arr)) return sum;
          return sum + arr.length;
        }, 0);

        setBookingsCount(total);
      }
    } catch (err) {
      console.error("[EstablishmentDashboard] load error", err);
      setError("Could not load dashboard data. Please pull to refresh.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-4 pt-4 pb-4">
        <Text className="text-[28px] font-extrabold text-gray-900">
          Dashboard
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center mt-10">
          <ActivityIndicator />
          <Text className="text-[12px] text-gray-500 mt-2">
            Loading your dashboard…
          </Text>
        </View>
      ) : establishment ? (
        <View className="px-4 mt-3">
          {/* Establishment summary card */}
          <View className="rounded-3xl bg-white px-4 py-4 border border-gray-200 shadow-sm mb-4">
            <Text className="text-[15px] font-semibold text-gray-900">
              {establishment.name}
            </Text>

            <View className="flex-row items-center mt-2">
              <View
                className="px-2 py-[2px] rounded-full"
                style={{
                  backgroundColor:
                    establishment.status === "approved"
                      ? "#DCFCE7"
                      : establishment.status === "rejected"
                      ? "#FEE2E2"
                      : "#FEF9C3",
                }}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{
                    color:
                      establishment.status === "approved"
                        ? "#166534"
                        : establishment.status === "rejected"
                        ? "#991B1B"
                        : "#92400E",
                  }}
                >
                  {establishment.status
                    ? establishment.status.charAt(0).toUpperCase() +
                      establishment.status.slice(1)
                    : "Pending"}
                </Text>
              </View>

              <Text className="text-[11px] text-gray-500 ml-2">
                Owner dashboard
              </Text>
            </View>
          </View>

          {/* Stats row – similar style to admin dashboard */}
          <View className="flex-row flex-wrap justify-between">
            <SummaryCard
              title="Total bookings"
              value={bookingsCount}
              bgColor="#7C3AED"
            />
            <SummaryCard
              title="Activities"
              value={activityCount}
              bgColor="#2563EB"
            />
            <SummaryCard
              title="Total Instructors"
              value={instructorCount}
              bgColor="#10B981"
            />
          </View>

          {error ? (
            <View className="mt-2">
              <Text className="text-[11px] text-red-500">{error}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View className="px-4 mt-8">
          <View className="rounded-3xl bg-white px-4 py-4 border border-gray-200 shadow-sm">
            <Text className="text-[15px] font-semibold text-gray-900 mb-1">
              No establishment yet
            </Text>
            <Text className="text-[12px] text-gray-500">
              Once your establishment is created and approved, you’ll see
              activity, instructor, and booking stats here.
            </Text>
          </View>
          {error ? (
            <Text className="text-[11px] text-red-500 mt-2">{error}</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
