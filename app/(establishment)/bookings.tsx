import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image
} from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchActivities } from "@/api/activities";
import { fetchBusinessBookingSlots } from "@/api/bookings";
import { API_BASE_URL } from "@/api/client";

type Establishment = {
  id: number;
  name: string;
  status: string;
};

type Activity = {
  id: number;
  establishment_id: number;
  title?: string;
  name?: string;
  description?: string | null;
};

type SlotBooking = {
  id: number;
  user_id: number;
  people_count: number;
  status: string;
  booked_for: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
};

type BookingSlot = {
  schedule_id: number;
  activity_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  is_active: boolean;
  total_confirmed: number;
  total_all: number;
  bookings: SlotBooking[];
};

type DayOption = {
  key: string; // "YYYY-MM-DD"
  label: string; // "Mon 24"
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatMonthYearFromKey(key: string | null): string {
  if (!key) return "";
  const d = new Date(key + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const month = d.toLocaleString(undefined, { month: "long" });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildUpcomingDays(numDays: number = 14): DayOption[] {
  const result: DayOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const label = `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
    result.push({
      key: formatDateKey(d),
      label,
    });
  }

  return result;
}

function to12h(hhmmss: string): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  if (parts.length < 2) return hhmmss;

  const rawH = parseInt(parts[0], 10);
  const rawM = parseInt(parts[1], 10);

  if (
    !Number.isFinite(rawH) ||
    !Number.isFinite(rawM) ||
    rawH < 0 ||
    rawH > 23 ||
    rawM < 0 ||
    rawM > 59
  ) {
    return hhmmss;
  }

  const H = rawH;
  const M = rawM;
  const h12 = ((H % 12) || 12).toString();
  const ampm = H < 12 ? "AM" : "PM";

  return `${h12}:${String(M).padStart(2, "0")} ${ampm}`;
}

function getActivityMainImageUrl(item: any): string | null {
  const candidate =
    item?.main_image ||
    item?.image_url ||
    (Array.isArray(item?.images) && item.images[0]?.url) ||
    null;

  if (!candidate) return null;
  if (typeof candidate !== "string") return null;

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }
  return `${API_BASE_URL}/images/${candidate}`;
}

export default function EstablishmentBookings() {
  const { id: userId } = useCurrentUser();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [days] = useState<DayOption[]>(() => buildUpcomingDays(14));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // slots grouped by activity id for the selected day
  const [slotsByActivity, setSlotsByActivity] = useState<
    Record<number, BookingSlot[]>
  >({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // which slot is expanded to show bookings
  const [selectedSlotScheduleId, setSelectedSlotScheduleId] = useState<number | null>(
    null
  );

  const anySlots = useMemo(
    () =>
      activities.some(
        (a) => (slotsByActivity[a.id] ?? []).length > 0
      ),
    [activities, slotsByActivity]
  );

  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const estList = await fetchEstablishments({ owner_user_id: userId });
        const est = estList?.[0];

        if (!est?.id) {
          setEstablishment(null);
          setActivities([]);
          setError("You do not have an establishment yet.");
          return;
        }

        setEstablishment({
          id: est.id,
          name: est.name,
          status: est.status,
        });

        const acts = await fetchActivities({
          establishment_id: est.id,
          order: "newest",
        });

        const safeActs: Activity[] = Array.isArray(acts) ? acts : [];
        setActivities(safeActs);

        // default to today
        if (!selectedDateKey && days.length) {
          setSelectedDateKey(days[0].key);
        }
      } catch (err) {
        console.error("Error loading bookings overview", err);
        setError("Could not load bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  // Load slots for all activities when the selected day changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDateKey || !activities.length) {
        setSlotsByActivity({});
        return;
      }

      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlotScheduleId(null);

      try {
        const map: Record<number, BookingSlot[]> = {};

        await Promise.all(
          activities.map(async (act) => {
            try {
              const res = await fetchBusinessBookingSlots({
                activity_id: act.id,
                date: selectedDateKey,
              });
              const incomingSlots: BookingSlot[] = Array.isArray(res?.slots)
                ? res.slots
                : [];
              map[act.id] = incomingSlots;
            } catch (err) {
              console.error(
                "Error loading booking slots for activity",
                act.id,
                err
              );
              map[act.id] = [];
            }
          })
        );

        setSlotsByActivity(map);
      } catch (err) {
        console.error("Error building booking slots map", err);
        setSlotsError("Could not load time slots for this day.");
        setSlotsByActivity({});
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [selectedDateKey, activities]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
        <Text className="mt-2 text-gray-600">Loading bookings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-slate-50">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  if (!establishment) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-slate-50">
        <Text className="text-center text-gray-600">
          You do not have an establishment yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="px-4 py-4">
        {/* Page title */}
        <Text className="text-[22px] font-extrabold text-gray-900">
          Bookings
        </Text>
        <Text className="mt-1 text-[13px] text-gray-500">
          Select a day to see bookings for your activities.
        </Text>

        {/* Calendar-style day selector */}
        <View className="mt-5">
            <Text className="text-[18px] font-extrabold text-gray-900">
                Select time
            </Text>

            {selectedDateKey && (
                <Text className="mt-[2px] text-[12px] text-gray-500">
                {formatMonthYearFromKey(selectedDateKey)}
                </Text>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3 flex-row"
            >
                {days.map((d) => {
                const isSelected = d.key === selectedDateKey;

                const dateObj = new Date(d.key + "T00:00:00");
                const dayNumber = dateObj.getDate();
                const weekdayLabel = DAY_LABELS[dateObj.getDay()]; // Tue, Wed, etc.

                return (
                    <TouchableOpacity
                    key={d.key}
                    onPress={() => setSelectedDateKey(d.key)}
                    className="mr-3 mb-2 items-center"
                    >
                    <View
                        className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                        isSelected
                            ? "bg-purple-600 border-purple-600"
                            : "bg-white border-gray-300"
                        }`}
                    >
                        <Text
                        className={`text-[15px] font-semibold ${
                            isSelected ? "text-white" : "text-gray-900"
                        }`}
                        >
                        {dayNumber}
                        </Text>
                    </View>
                    <Text
                        className={`mt-1 text-[11px] ${
                        isSelected ? "text-purple-600 font-semibold" : "text-gray-500"
                        }`}
                    >
                        {weekdayLabel}
                    </Text>
                    </TouchableOpacity>
                );
                })}
            </ScrollView>
        </View>


        {/* Activities as cards, like approved/rejected establishments */}
        <View className="mt-5">
          <Text className="text-[14px] font-semibold text-gray-900 mb-2">
            Activities & time slots
          </Text>

          {activities.length === 0 ? (
            <Text className="text-[13px] text-gray-500">
              You have no activities yet. Create one in the Activities tab.
            </Text>
          ) : !selectedDateKey ? (
            <Text className="text-[13px] text-gray-500">
              Choose a day above to see bookings.
            </Text>
          ) : slotsLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator />
              <Text className="mt-2 text-gray-500 text-[13px]">
                Loading time slots...
              </Text>
            </View>
          ) : slotsError ? (
            <Text className="text-[13px] text-red-500">{slotsError}</Text>
          ) : !anySlots ? (
            <Text className="text-[13px] text-gray-500">
              No activities today.
            </Text>
          ) : (
            activities.map((act) => {
              const slots = slotsByActivity[act.id] ?? [];
              if (!slots.length) return null;

              const activityTitle = act.title ?? act.name ?? "Untitled activity";
              const totalConfirmed = slots.reduce(
                (sum, slot) => sum + (slot.total_confirmed || 0),
                0
              );

              const imageUrl = getActivityMainImageUrl(act);
              return (
                <View
                  key={act.id}
                  className="mb-4 rounded-3xl bg-white overflow-hidden border border-gray-200 shadow-sm"
                >
                  {/* Top banner (like the image area on establishment cards) */}
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      className="w-full h-28"
                    />
                  ) : (
                    <View className="w-full h-28 bg-slate-200" />
                  )}

                  {/* Card content */}
                  <View className="px-3 py-3">
                    <Text className="text-[15px] font-semibold text-gray-900">
                      {activityTitle}
                    </Text>
                    {act.description ? (
                      <Text className="text-[12px] text-gray-500 mt-1">
                        {act.description}
                      </Text>
                    ) : null}

                    <Text className="text-[12px] text-gray-500 mt-2">
                      {slots.length}{" "}
                      {slots.length === 1 ? "time slot" : "time slots"} •{" "}
                      {totalConfirmed} confirmed bookings

                    </Text>

                    {/* Time slots for this activity/day */}
                    <View className="mt-3 border-t border-gray-100 pt-2">
                      {slots.map((slot) => {
                        const isSelected =
                          slot.schedule_id === selectedSlotScheduleId;

                        const bookedSummary =
                          slot.capacity != null
                            ? `${slot.total_confirmed}/${slot.capacity} confirmed`
                            : `${slot.total_confirmed} confirmed${
                                slot.total_all > slot.total_confirmed
                                  ? ` (${slot.total_all} incl. other statuses)`
                                  : ""
                              }`;

                        return (
                          <TouchableOpacity
                            key={slot.schedule_id}
                            onPress={() =>
                              setSelectedSlotScheduleId(
                                isSelected ? null : slot.schedule_id
                              )
                            }
                            className={`mb-2 p-2 rounded-2xl border ${
                              isSelected
                                ? "bg-purple-50 border-purple-400"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <View className="flex-row items-center justify-between">
                              <View>
                                <Text className="text-[13px] font-semibold text-gray-900">
                                  {to12h(slot.start_time)}
                                  {slot.end_time
                                    ? ` – ${to12h(slot.end_time)}`
                                    : ""}
                                </Text>
                                <Text className="text-[11px] text-gray-600 mt-[2px]">
                                  {bookedSummary}
                                </Text>
                              </View>
                              <Text className="text-[11px] font-semibold text-purple-600">
                                {isSelected ? "Hide" : "View"}
                              </Text>
                            </View>

                            {isSelected && (
                              <View className="mt-2 border-t border-gray-100 pt-2">
                                {slot.bookings.length === 0 ? (
                                  <Text className="text-[11px] text-gray-500">
                                    No bookings yet for this slot.
                                  </Text>
                                ) : (
                                  slot.bookings.map((b) => (
                                    <View
                                      key={b.id}
                                      className="mb-2 p-2 rounded-xl bg-white border border-gray-200"
                                    >
                                      <Text className="text-[12px] font-semibold text-gray-900">
                                        {b.user_name || "User"}{" "}
                                        <Text className="text-[11px] font-normal text-gray-500">
                                          ({b.people_count}{" "}
                                          {b.people_count === 1
                                            ? "person"
                                            : "people"}
                                          )
                                        </Text>
                                      </Text>
                                      {b.user_email && (
                                        <Text className="text-[11px] text-gray-600">
                                          {b.user_email}
                                        </Text>
                                      )}
                                      {b.user_phone && (
                                        <Text className="text-[11px] text-gray-600">
                                          {b.user_phone}
                                        </Text>
                                      )}
                                      <Text className="text-[11px] mt-[2px] text-gray-500">
                                        Status:{" "}
                                        <Text className="font-semibold">
                                          {b.status}
                                        </Text>
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}
