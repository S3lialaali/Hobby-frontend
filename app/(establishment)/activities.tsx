// reads user id from the token and fetches the establishment's activities
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Image
} from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import {
  createActivity,
  fetchActivities,
  updateActivity,
  deleteActivity,
} from "@/api/activities";
import {
  fetchSchedulesByActivity,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "@/api/activitySchedules";
import * as ImagePicker from "expo-image-picker";
import { uploadActivityImage } from "@/api/uploads";
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
  // price can come back from MySQL as string, but locally we treat it as number | null
  price?: number | string | null;
};

type ActivitySchedule = {
  id: number;
  activity_id: number;
  day_of_week: number; // 0..6
  start_time: string; // "HH:MM:SS"
  end_time?: string | null;
  capacity?: number | null;
  is_active: boolean | 0 | 1;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function to12h(hhmmss: string) {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  if (parts.length < 2) return hhmmss;
  const [H, M] = parts.map((v) => parseInt(v, 10));
  if (!Number.isFinite(H) || !Number.isFinite(M)) return hhmmss;
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

export default function EstablishmentActivities() {
  // read user id and role from access token
  const { id: userId } = useCurrentUser();

  // UI state
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedulesByActivity, setSchedulesByActivity] = useState<
    Record<number, ActivitySchedule[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  // add activity form states
  const [creating, setCreating] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addImage, setAddImage] = useState<{ uri: string } | null>(null);
  const [changingActivityImageId, setChangingActivityImageId] = useState<number | null>(null);

  // edit activity form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // schedule form states (one shared editor for whichever activity is selected)
  const [scheduleFormActivityId, setScheduleFormActivityId] = useState<number | null>(null);
  const [scheduleEditingId, setScheduleEditingId] = useState<number | null>(null);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<string>("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleCapacity, setScheduleCapacity] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const currentScheduleActivity = useMemo(
    () =>
      scheduleFormActivityId != null
        ? activities.find((a) => a.id === scheduleFormActivityId) ?? null
        : null,
    [activities, scheduleFormActivityId]
  );

  async function handlePickAddImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need access to your photos to select an activity image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (asset?.uri) {
        setAddImage({ uri: asset.uri });
      }
    } catch (err) {
      console.warn("Image pick error", err);
      Alert.alert("Image error", "Could not open the image library. Please try again.");
    }
  }

  async function handleChangeActivityImage(activityId: number) {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need access to your photos to change the activity image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (!asset?.uri) return;

      setChangingActivityImageId(activityId);

      try {
        await uploadActivityImage(activityId, asset.uri);
        await load(); // ⬅️ reuse your existing reload function
      } catch (err) {
        console.error("Error changing activity image", err);
        Alert.alert(
          "Image upload failed",
          "Could not update the activity image. Please try again."
        );
      } finally {
        setChangingActivityImageId(null);
      }
    } catch (err) {
      console.warn("Image picker error", err);
      Alert.alert("Error", "Could not open the image library. Please try again.");
    }
  }

  async function load() {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // 1) fetch establishments owned by this user
      const establishmentList = await fetchEstablishments({
        owner_user_id: userId,
      });

      // 2) resolve the establishment id (we currently assume one per business user)
      const est = establishmentList?.[0];

      if (!est?.id) {
        setEstablishment(null);
        setActivities([]);
        setSchedulesByActivity({});
        setError("No establishment yet");
        return;
      }

      // snapshot for header
      setEstablishment({
        id: est.id,
        name: est.name,
        status: est.status,
      });

      // 3) if id is available, fetch activities
      const acts = await fetchActivities({
        establishment_id: est.id,
        order: "newest",
      });
      const safeActs: Activity[] = Array.isArray(acts) ? acts : [];
      setActivities(safeActs);

      // 4) fetch schedules for each activity (business view)
      const schedMap: Record<number, ActivitySchedule[]> = {};
      await Promise.all(
        safeActs.map(async (a) => {
          try {
            const slots = await fetchSchedulesByActivity(a.id);
            schedMap[a.id] = Array.isArray(slots) ? (slots as ActivitySchedule[]) : [];
          } catch (err) {
            // if schedules endpoint fails, just treat as no schedules
            schedMap[a.id] = [];
          }
        })
      );
      setSchedulesByActivity(schedMap);
    } catch (err) {
      console.error("Error loading establishment activities", err);
      setError("Could not load activities. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  // Handle creating new activities
  async function handleAdd() {
    if (!establishment?.id) return;
    if (!addImage) {
      Alert.alert("Image required", "Please select an image for this activity.");
      return;
    }


    const title = addTitle.trim();
    if (!title) {
      Alert.alert("Missing title", "Please enter a title for the activity.");
      return;
    }

    // price (optional)
    let price: number | null = null;
    if (addPrice.trim()) {
      const n = Number(addPrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert("Invalid price", "Price must be a positive number.");
        return;
      }
      price = n;
    }

    try {
      setCreating(true);

      //payload should match backend
      const payload = {
        establishment_id: establishment.id,
        title,
        description: addDescription.trim() || null,
        price,
      };

      // create activity and get its id
      const created = await createActivity(payload);

      // upload main image (one per activity at UI level)
      if (created?.id && addImage?.uri) {
        try {
          await uploadActivityImage(created.id, addImage.uri);
        } catch (uploadErr) {
          console.error("Error uploading activity image", uploadErr);
          Alert.alert(
            "Image upload failed",
            "The activity was created, but we could not upload its image. You can try again later."
          );
        }
      }

      await load();

      //reset form
      setAddTitle("");
      setAddDescription("");
      setAddPrice("");
      setAddImage(null);
    } catch (err) {
      console.error("Error creating activity", err);
      Alert.alert("Error", "Could not create activity. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // editing activity
  function startEdit(act: Activity) {
    setEditingId(act.id);
    setEditTitle(act.title ?? act.name ?? "");
    setEditDescription(act.description ?? "");
    const p =
      typeof act.price === "number" || typeof act.price === "string"
        ? String(act.price)
        : "";
    setEditPrice(p);
  }

  // Save edit changes to activities
  async function handleSaveEdit() {
    if (!establishment?.id || editingId == null) return;

    const title = editTitle.trim();
    if (!title) {
      Alert.alert("Missing title", "Please enter a title for the activity.");
      return;
    }

    let price: number | null = null;
    if (editPrice.trim()) {
      const n = Number(editPrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert("Invalid price", "Price must be a positive number.");
        return;
      }
      price = n;
    }

    const payload = {
      title,
      description: editDescription.trim() || null,
      price,
    };

    try {
      await updateActivity(editingId, payload);

      // Update local state without full reload
      const patch: Partial<Activity> = {
        title,
        description: payload.description,
        price,
      };
      setActivities((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...patch } : a))
      );

      // reset edit state
      setEditingId(null);
      setEditTitle("");
      setEditDescription("");
      setEditPrice("");
    } catch (err) {
      console.error("Error updating activity", err);
      Alert.alert("Error", "Could not update activity. Please try again.");
    }
  }

  // delete activity
  async function handleDelete(id: number) {
    Alert.alert(
      "Delete activity",
      "Are you sure you want to delete this activity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteActivity(id);

              // remove from activities list
              setActivities((prev) => prev.filter((a) => a.id !== id));

              // drop any schedules we have cached for it
              setSchedulesByActivity((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });

              // if in middle of editing this activity, close the editing form
              if (editingId === id) {
                setEditingId(null);
                setEditTitle("");
                setEditDescription("");
                setEditPrice("");
              }

              // if schedule form is open for this activity, reset it
              if (scheduleFormActivityId === id) {
                resetScheduleForm();
              }
            } catch (err) {
              console.error("Error deleting activity", err);
              Alert.alert("Error", "Could not delete activity. Please try again.");
            }
          },
        },
      ]
    );
  }

  // ---- SCHEDULE HELPERS ----

  function resetScheduleForm() {
    setScheduleFormActivityId(null);
    setScheduleEditingId(null);
    setScheduleDayOfWeek("");
    setScheduleStartTime("");
    setScheduleEndTime("");
    setScheduleCapacity("");
  }

  function openCreateSchedule(activityId: number) {
    setScheduleFormActivityId(activityId);
    setScheduleEditingId(null);
    setScheduleDayOfWeek("");
    setScheduleStartTime("");
    setScheduleEndTime("");
    setScheduleCapacity("");
  }

  function startEditSchedule(activityId: number, slot: ActivitySchedule) {
    setScheduleFormActivityId(activityId);
    setScheduleEditingId(slot.id);
    setScheduleDayOfWeek(String(slot.day_of_week));
    setScheduleStartTime(slot.start_time?.slice(0, 5) ?? "");
    setScheduleEndTime(slot.end_time ? slot.end_time.slice(0, 5) : "");
    setScheduleCapacity(
      slot.capacity !== null && slot.capacity !== undefined
        ? String(slot.capacity)
        : ""
    );
  }

  function isValidTimeString(t: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(t.trim());
  if (!m) return false;

  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}


  async function handleSaveSchedule() {
    if (!scheduleFormActivityId) return;

    const dow = scheduleDayOfWeek.trim();
    if (!dow) {
      Alert.alert("Missing day", "Please choose a day of the week.");
      return;
    }

    const dayNum = Number(dow);
    if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
      Alert.alert("Invalid day", "Day must be between Sunday and Saturday.");
      return;
    }

    const start = scheduleStartTime.trim();
    const end = scheduleEndTime.trim();
    
    if (!isValidTimeString(start)) {
      Alert.alert(
        "Invalid time",
        "Start time must be between 00:00 and 23:59 in HH:MM format (e.g. 18:30)."
      );
      return;
    }

    if (end && !isValidTimeString(end)) {
      Alert.alert(
        "Invalid time",
        "End time must be between 00:00 and 23:59 in HH:MM format (e.g. 19:30), or left empty."
      );
      return;
    }

    let cap: number | null = null;
    if (scheduleCapacity.trim()) {
      const n = Number(scheduleCapacity.trim());
      if (!Number.isFinite(n) || n < 1) {
        Alert.alert(
          "Invalid capacity",
          "Capacity must be a positive whole number."
        );
        return;
      }
      cap = n;
    }

    const payload = {
      activity_id: scheduleFormActivityId,
      day_of_week: dayNum,
      start_time: start,
      end_time: end || null,
      capacity: cap,
      is_active: true,
    };

    try {
      setScheduleSaving(true);

      if (scheduleEditingId) {
        const updated = await updateSchedule(scheduleEditingId, {
          day_of_week: payload.day_of_week,
          start_time: payload.start_time,
          end_time: payload.end_time,
          capacity: payload.capacity,
          is_active: true,
        });

        setSchedulesByActivity((prev) => {
          const list = prev[scheduleFormActivityId] ?? [];
          return {
            ...prev,
            [scheduleFormActivityId]: list.map((s) =>
              s.id === scheduleEditingId ? (updated as ActivitySchedule) : s
            ),
          };
        });
      } else {
        const created = await createSchedule(payload);
        setSchedulesByActivity((prev) => {
          const list = prev[scheduleFormActivityId] ?? [];
          const next = [...list, created as ActivitySchedule];
          next.sort(
            (a, b) =>
              a.day_of_week - b.day_of_week ||
              a.start_time.localeCompare(b.start_time)
          );
          return { ...prev, [scheduleFormActivityId]: next };
        });
      }

      resetScheduleForm();
    } catch (err) {
      console.error("Error saving schedule", err);
      Alert.alert(
        "Error",
        scheduleEditingId
          ? "Could not update schedule. Please try again."
          : "Could not create schedule. Please try again."
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  function confirmDeleteSchedule(activityId: number, scheduleId: number) {
    Alert.alert(
      "Delete schedule",
      "Are you sure you want to delete this schedule slot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteSchedule(activityId, scheduleId),
        },
      ]
    );
  }

  async function handleDeleteSchedule(activityId: number, scheduleId: number) {
    try {
      await deleteSchedule(scheduleId);
      setSchedulesByActivity((prev) => ({
        ...prev,
        [activityId]: (prev[activityId] ?? []).filter(
          (s) => s.id !== scheduleId
        ),
      }));
      if (scheduleEditingId === scheduleId) {
        resetScheduleForm();
      }
    } catch (err) {
      console.error("Error deleting schedule", err);
      Alert.alert(
        "Error",
        "Could not delete schedule. It may have existing bookings."
      );
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
        <Text className="mt-2 text-gray-600">Loading activities...</Text>
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
        {/* Header showing which establishment this dashboard is for */}
        <Text className="text-[28px] font-extrabold text-gray-900">
          Activities & schedules
        </Text>
        
        {/* Create new activity form */}
        <View className="mt-6 mb-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <Text className="font-semibold text-gray-900 mb-1">
            Add new activity
          </Text>
          <Text className="text-[12px] text-gray-500 mb-3">
            Give your activity a clear title and optional description and price.
          </Text>

          {/* Activity image (required) */}
          <Text className="font-semibold mt-1 mb-2">Activity image *</Text>
          <View className="flex-row items-center mb-2">
            <TouchableOpacity
              onPress={handlePickAddImage}
              className="px-4 py-2 rounded-2xl bg-purple-600"
            >
              <Text className="text-white text-sm font-semibold">Choose image</Text>
            </TouchableOpacity>

            {addImage ? (
              <Image
                source={{ uri: addImage.uri }}
                className="w-16 h-16 rounded-xl ml-3"
              />
            ) : (
              <Text className="ml-3 text-xs text-gray-500">No image selected</Text>
            )}
          </View>

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
            placeholderTextColor="grey"
            placeholder="Title *"
            value={addTitle}
            onChangeText={setAddTitle}
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
            placeholderTextColor="grey"
            placeholder="Description"
            value={addDescription}
            onChangeText={setAddDescription}
            multiline
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
            placeholderTextColor="grey"
            placeholder="Price (optional, BHD)"
            keyboardType="numeric"
            value={addPrice}
            onChangeText={setAddPrice}
          />

          <TouchableOpacity
            onPress={handleAdd}
            disabled={creating}
            className="mt-1 rounded-2xl bg-purple-600 px-4 py-2 items-center justify-center"
          >
            {creating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">Create activity</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Edit existing activity form (only visible when editingId is set) */}
        {editingId != null && (
          <View className="mb-4 p-4 rounded-2xl border border-amber-300 bg-amber-50">
            <Text className="font-semibold mb-2 text-amber-900">
              Edit activity
            </Text>

            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
              placeholderTextColor="grey"
              placeholder="Title *"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
              placeholderTextColor="grey"
              placeholder="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />

            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-2 mb-2 bg-white"
              placeholderTextColor="grey"
              placeholder="Price (BHD)"
              keyboardType="numeric"
              value={editPrice}
              onChangeText={setEditPrice}
            />

            <View className="flex-row gap-4 mt-1">
              <TouchableOpacity
                onPress={handleSaveEdit}
                className="flex-1 rounded-2xl bg-purple-600 px-4 py-2 items-center justify-center"
              >
                <Text className="text-white font-semibold">Save changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setEditingId(null);
                  setEditTitle("");
                  setEditDescription("");
                  setEditPrice("");
                }}
                className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 items-center justify-center"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Schedule editor card */}
        {scheduleFormActivityId != null && (
          <View className="mb-5 p-4 rounded-2xl border border-purple-300 bg-purple-50">
            <Text className="font-semibold text-gray-900 mb-1">
              {scheduleEditingId ? "Edit schedule" : "Add schedule"}
            </Text>
            <Text className="text-[12px] text-gray-600 mb-3">
              {currentScheduleActivity
                ? `For activity: ${
                    currentScheduleActivity.title ??
                    currentScheduleActivity.name ??
                    "Untitled activity"
                  }`
                : "Select an activity below to manage its schedules."}
            </Text>

            <Text className="text-[12px] font-medium text-gray-800 mb-1">
              Day of week
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {DAY_LABELS.map((label, index) => {
                const selected = String(index) === scheduleDayOfWeek;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setScheduleDayOfWeek(String(index))}
                    className={`px-3 py-[6px] rounded-full border ${
                      selected
                        ? "bg-purple-600 border-purple-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-semibold ${
                        selected ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-gray-800 mb-1">
                  Start time
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-3 py-2 text-[13px] bg-white"
                  placeholderTextColor="grey"
                  placeholder="HH:MM (24h)"
                  value={scheduleStartTime}
                  onChangeText={setScheduleStartTime}
                />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-medium text-gray-800 mb-1">
                  End time (optional)
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-3 py-2 text-[13px] bg-white"
                  placeholderTextColor="grey"
                  placeholder="HH:MM"
                  value={scheduleEndTime}
                  onChangeText={setScheduleEndTime}
                />
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-[12px] font-medium text-gray-800 mb-1">
                Capacity (optional)
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-3 py-2 text-[13px] bg-white"
                placeholderTextColor="grey"
                placeholder="e.g. 10"
                keyboardType="numeric"
                value={scheduleCapacity}
                onChangeText={setScheduleCapacity}
              />
            </View>

            <View className="flex-row gap-4 mt-4">
              <TouchableOpacity
                onPress={handleSaveSchedule}
                disabled={scheduleSaving}
                className="flex-1 rounded-2xl bg-purple-600 px-4 py-2 items-center justify-center"
              >
                {scheduleSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold">
                    {scheduleEditingId ? "Save changes" : "Add schedule"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={resetScheduleForm}
                disabled={scheduleSaving}
                className="flex-1 rounded-2xl border border-gray-300 px-4 py-2 items-center justify-center"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Activities list */}
        <View className="mt-2">
          <Text className="text-[16px] font-semibold text-gray-900 mb-2">
            Current activities
          </Text>

          <FlatList
            data={activities}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false} // we scroll the outer ScrollView instead
            ListEmptyComponent={
              <Text className="text-gray-500">
                You have no activities yet. Add one above to get started.
              </Text>
            }
            renderItem={({ item }) => {
              const slots = schedulesByActivity[item.id] ?? [];
              const mainImageUrl = getActivityMainImageUrl(item);

              return (
                <View className="mb-4 rounded-3xl bg-white overflow-hidden border border-gray-200 shadow-sm">
                  {/* Top image/banner */}
                  {mainImageUrl ? (
                    <Image source={{ uri: mainImageUrl }} className="w-full h-32" />
                  ) : (
                    <View className="w-full h-32 bg-slate-200" />
                  )}

                  <View className="px-3 py-3">
                    {/* Title + description + price */}
                    <Text className="font-semibold text-gray-900 text-[15px]">
                      {item.title ?? item.name ?? "Untitled activity"}
                    </Text>

                    {item.description ? (
                      <Text className="text-gray-500 mt-1 text-[12px]">
                        {item.description}
                      </Text>
                    ) : null}

                    {item.price !== null &&
                      item.price !== undefined &&
                      String(item.price) !== "" && (
                        <Text className="text-gray-500 mt-1 text-[12px]">
                          Price: {item.price} BHD
                        </Text>
                      )}

                    {/* Schedules */}
                    <View className="mt-3 border-t border-gray-100 pt-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[13px] font-semibold text-gray-800">
                          Schedules
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            scheduleFormActivityId === item.id
                              ? resetScheduleForm()
                              : openCreateSchedule(item.id)
                          }
                          className="px-3 py-[4px] rounded-full bg-purple-50"
                        >
                          <Text className="text-[12px] font-semibold text-purple-600">
                            {scheduleFormActivityId === item.id
                              ? "Close"
                              : "Add / edit"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {slots.length ? (
                        slots.map((s) => (
                          <View
                            key={s.id}
                            className="flex-row items-center justify-between mt-1"
                          >
                            <Text className="text-[12px] text-gray-700">
                              {DAY_LABELS[s.day_of_week]} • {to12h(s.start_time)}
                              {s.capacity
                                ? ` • ${s.capacity} ${
                                    s.capacity === 1 ? "spot" : "spots"
                                  }`
                                : ""}
                            </Text>
                            <View className="flex-row gap-3">
                              <TouchableOpacity
                                onPress={() => startEditSchedule(item.id, s)}
                              >
                                <Text className="text-[12px] font-semibold text-purple-600">
                                  Edit
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => confirmDeleteSchedule(item.id, s.id)}
                              >
                                <Text className="text-[12px] font-semibold text-red-500">
                                  Delete
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text className="text-[12px] text-gray-400">
                          No schedules yet. Add one for this activity.
                        </Text>
                      )}
                    </View>

                    {/* Actions row: change image + edit/delete */}
                    <View className="flex-row flex-wrap items-center gap-4 mt-3">
                      <TouchableOpacity onPress={() => handleChangeActivityImage(item.id)}>
                        <Text className="text-[12px] font-semibold text-purple-600">
                          {changingActivityImageId === item.id
                            ? "Changing image..."
                            : "Change image"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => startEdit(item)}>
                        <Text className="text-[12px] font-semibold text-purple-600">
                          Edit
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Text className="text-[12px] font-semibold text-red-600">
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
