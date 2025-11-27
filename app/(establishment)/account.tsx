import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../sessions/AuthContext";
import { getApiError, API_BASE_URL, resolveImageUrl } from "../../api/client";
import {
  fetchEstablishments,
  updateEstablishment,
} from "../../api/establishments";
import { fetchActivities } from "../../api/activities";
import { fetchInstructors } from "../../api/instructors";
import { uploadEstablishmentImage } from "../../api/uploads";

const VIOLET = "#7C3AED";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[20px] font-bold text-gray-900 mb-4">{children}</Text>
  );
}

function Row({
  icon,
  label,
  onPress,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
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
            danger ? "text-red-600 font-semibold" : "text-gray-900 font-medium"
          }`}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        {value ? (
          <Text className="text-[13px] text-gray-500 mr-2">{value}</Text>
        ) : null}
        {!danger && (
          <Feather name="chevron-right" size={18} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}

type Establishment = {
  id: number;
  name: string;
  category?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  image_url?: string | null;
};

export default function EstablishmentAccountScreen() {
  const router = useRouter();
  const { user, initializing, loading, signOut, updateUserProfile } = useAuth();

  const [establishment, setEstablishment] = useState<Establishment | null>(
    null
  );
  const [initialLoading, setInitialLoading] = useState(true);

  const [activitiesCount, setActivitiesCount] = useState(0);
  const [instructorsCount, setInstructorsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  // --- Edit modal state ---
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editMapsUrl, setEditMapsUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const resetEditForm = () => {
    if (!establishment) {
      setEditName("");
      setEditEmail(user?.email ?? "");
      setEditPhone(user?.phone ?? "");
      setEditAddress("");
      setEditMapsUrl("");
      setPendingImageUri(null);
      return;
    }
    setEditName(establishment.name ?? "");
    setEditEmail(establishment.email ?? user?.email ?? "");
    setEditPhone(establishment.phone ?? user?.phone ?? "");
    setEditAddress(establishment.address ?? "");
    setEditMapsUrl("");
    setPendingImageUri(null);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        setInitialLoading(false);
        return;
      }

      try {
        setInitialLoading(true);
        // get the establishment owned by this business user
        const list: any = await fetchEstablishments({
          owner_user_id: user.id,
        });
        const first = Array.isArray(list) ? list[0] : list;
        if (!cancelled) {
          setEstablishment(first || null);
        }
      } catch (err) {
        console.error("load establishment error", err);
        if (!cancelled) {
          Alert.alert(
            "Error",
            getApiError(err) || "Failed to load establishment."
          );
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Load basic stats (activities / instructors) for the header, similar to upcoming/past
  useEffect(() => {
    if (!establishment?.id) return;
    const estId = establishment.id;
    let cancelled = false;

    async function loadStats() {
      try {
        setStatsLoading(true);
        const [acts, instr] = await Promise.all([
          fetchActivities({ establishment_id: estId }),
          fetchInstructors({ establishment_id: estId }),
        ]);
        if (!cancelled) {
          setActivitiesCount(Array.isArray(acts) ? acts.length : 0);
          setInstructorsCount(Array.isArray(instr) ? instr.length : 0);
        }
      } catch (err) {
        console.error("load stats error", err);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [establishment?.id]);

  const avatarUri = useMemo(() => {
    if (!establishment?.image_url) {
      // fallback placeholder – adjust to your actual placeholder if different
      return resolveImageUrl("images/establishment_placeholder.jpeg");
    }
    // image_url is like "establishment/establishment-17-....jpeg"
    return resolveImageUrl(establishment.image_url);
  }, [establishment?.image_url]);

  const previewImageUri = pendingImageUri || avatarUri;

  // Change photo (now ONLY used inside the modal)
  const handleChangePhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need access to your photos to change the establishment image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      // ✅ Only set local preview. Actual upload happens in handleSaveProfile
      setPendingImageUri(asset.uri);
    } catch (err: any) {
      console.error("pick establishment image error", err);
      Alert.alert(
        "Error",
        "Could not open your photo library. Please try again."
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/screens/login");
    }
  };

  // Save changes from edit modal:
  // - update establishment info (name/email/phone/address + google_maps_url)
  // - update user email/phone if changed, and trigger reverification flows
  const handleSaveProfile = async () => {
    if (!user || !establishment) return;

    const newName = editName.trim();
    const newEmail = editEmail.trim();
    const newPhone = editPhone.trim();
    const newAddress = editAddress.trim();
    const mapsUrl = editMapsUrl.trim();

    if (!newName) {
      Alert.alert("Missing information", "Establishment name is required.");
      return;
    }

    // Build payload for establishment
    const estPayload: any = {};
    if (newName !== (establishment.name || "")) {
      estPayload.name = newName;
    }
    if (newEmail !== (establishment.email || "")) {
      estPayload.email = newEmail || null;
    }
    if (newPhone !== (establishment.phone || "")) {
      estPayload.phone = newPhone || null;
    }
    if (newAddress !== (establishment.address || "")) {
      estPayload.address = newAddress || null;
    }
    if (mapsUrl) {
      estPayload.google_maps_url = mapsUrl;
    }

    // Build payload for user (login email/phone) → triggers reverification
    const userPayload: any = {};
    if (newEmail && newEmail !== (user.email || "")) {
      userPayload.email = newEmail;
    }
    if (newPhone && newPhone !== (user.phone || "")) {
      userPayload.phone = newPhone;
    }

    const emailChanged = userPayload.email !== undefined;
    const phoneChanged = userPayload.phone !== undefined;

    if (
      !Object.keys(estPayload).length &&
      !Object.keys(userPayload).length &&
      !pendingImageUri
    ) {
      Alert.alert(
        "Nothing to update",
        "You have not changed any information."
      );
      return;
    }

    setSavingProfile(true);
    try {
      let updatedEst = establishment;

      // 1) Update establishment basic fields (name/email/phone/address/mapsUrl)
      if (Object.keys(estPayload).length) {
        const apiEst = await updateEstablishment(establishment.id, estPayload);
        if (!apiEst) throw new Error("establishment_update_failed");

        // ✅ merge to preserve image_url (PATCH response does not include it)
        updatedEst = {
          ...establishment,
          ...apiEst,
          image_url: establishment.image_url,
        };
        setEstablishment(updatedEst);
      }

      // 2) Update user login email/phone (this also resets verification flags server-side)
      let updatedUser = user;
      if (Object.keys(userPayload).length) {
        updatedUser = await updateUserProfile(userPayload);
        if (!updatedUser) throw new Error("user_update_failed");
      }

      // 3) If there is a pending image, upload it now
      if (pendingImageUri) {
        setUploadingImage(true);
        try {
          const imgRes = await uploadEstablishmentImage(
            establishment.id,
            pendingImageUri
          );
          const newUrl =
            imgRes?.image_url ||
            imgRes?.imageUrl ||
            imgRes?.image_path ||
            imgRes?.path ||
            null;

          const mergedEst = {
            ...(updatedEst || establishment),
            image_url: newUrl || updatedEst?.image_url || establishment.image_url,
          };
          setEstablishment(mergedEst);
        } finally {
          setUploadingImage(false);
        }
        setPendingImageUri(null);
      }

      // Close modal AFTER all updates so card uses final state
      setEditProfileVisible(false);

      // 4) Reverification navigation if needed
      if (emailChanged) {
        Alert.alert(
          "Email updated",
          "Your login email has been updated. Please verify your new email address."
        );
        router.push({
          pathname: "/screens/verify-email",
          params: { email: updatedUser?.email ?? newEmail },
        });
        return;
      }

      if (phoneChanged) {
        Alert.alert(
          "Phone updated",
          "Your phone number has been updated. Please verify your new phone number."
        );
        router.push({
          pathname: "/screens/verify-phone",
          params: { phone: updatedUser?.phone ?? newPhone },
        });
        return;
      }

      Alert.alert(
        "Profile updated",
        "Your establishment details have been updated."
      );
    } catch (err: any) {
      console.error("edit establishment profile error", err);
      const msg =
        getApiError(err) ||
        "Failed to update establishment. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setSavingProfile(false);
    }
  };


  if (initializing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <Text className="text-gray-500">Loading…</Text>
        </SafeAreaView>
      </>
    );
  }

  if (initialLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator />
        </SafeAreaView>
      </>
    );
  }

  if (!establishment) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-[16px] font-semibold text-gray-800 mb-2">
            No establishment found
          </Text>
          <Text className="text-[13px] text-gray-500 text-center">
            This business account doesn’t have an establishment yet.
          </Text>
        </SafeAreaView>
      </>
    );
  }

  const displayName = establishment.name || "Your establishment";
  const handleBaseEmail = establishment.email || user?.email || "";
  const handle =
    establishment.category ||
    (handleBaseEmail ? handleBaseEmail.split("@")[0] : "business");
  const email = establishment.email || "—";
  const phone = establishment.phone || "—";
  // Derive a shorter location from the full address:
  const rawAddress = establishment.address || "";
  const addressParts = rawAddress
    ? rawAddress.split(",").map((p) => p.trim()).filter(Boolean)
    : [];
  const locationDisplay = addressParts.length
    ? addressParts[1] // only display city
    : "—";


  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <SafeAreaView className="flex-1 bg-white">
          <ScrollView
            contentContainerStyle={{ paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header title */}
            <View className="px-5 pt-2">
              <Text className="text-[28px] font-extrabold text-gray-900">
                Profile
              </Text>
            </View>

            {/* Profile Card – mirrors user profile card but for establishment */}
            <View className="px-5 mt-6">
              <View className="rounded-2xl border border-gray-200 bg-white p-5">
                <View className="flex-row items-center">
                  {/* Avatar (no longer clickable) */}
                  <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 mr-4">
                    {uploadingImage ? (
                      <View className="flex-1 items-center justify-center">
                        <ActivityIndicator />
                      </View>
                    ) : (
                      <Image source={{ uri: avatarUri }} className="w-full h-full" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-[18px] font-extrabold text-gray-900"
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    <Text
                      className="text-[13px] text-gray-600"
                      numberOfLines={1}
                    >
                      @{handle}
                    </Text>
                  </View>

                  {/* Edit pill – opens modal */}
                  <TouchableOpacity
                    className="flex-row items-center px-3 py-1 rounded-full bg-white border border-gray-200"
                    onPress={() => {
                      resetEditForm();
                      setEditProfileVisible(true)}}
                  >
                    <Feather name="edit-3" size={16} color={VIOLET} />
                    <Text className="ml-1 text-[12px] font-medium text-violet-700">
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick stats: Activities / Instructors */}
                <View className="mt-5 flex-row">
                  <View className="flex-1 items-center">
                    <Text className="text-[18px] font-extrabold text-gray-900">
                      {statsLoading ? "—" : activitiesCount}
                    </Text>
                    <Text className="text-[12px] text-gray-500">Activities</Text>
                  </View>
                  <View className="w-px bg-gray-200 mx-4" />
                  <View className="flex-1 items-center">
                    <Text className="text-[18px] font-extrabold text-gray-900">
                      {statsLoading ? "—" : instructorsCount}
                    </Text>
                    <Text className="text-[12px] text-gray-500">
                      Instructors
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Account section – same style as user profile */}
            <View className="px-5 mt-10">
              <SectionTitle>Account</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                <Row
                  icon={<Feather name="at-sign" size={18} color={VIOLET} />}
                  label="Name"
                  value={displayName}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="mail" size={18} color={VIOLET} />}
                  label="Email"
                  value={email}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="phone" size={18} color={VIOLET} />}
                  label="Phone"
                  value={phone}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="map-pin" size={18} color={VIOLET} />}
                  label="Location"
                  value={locationDisplay}
                />
              </View>
            </View>

            {/* Activity shortcuts – mirror user profile but for business */}
            <View className="px-5 mt-10">
              <SectionTitle>Management</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                <Row
                  icon={<Feather name="grid" size={18} color={VIOLET} />}
                  label="Manage activities"
                  onPress={() => router.push("/(establishment)/activities")}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="user" size={18} color={VIOLET} />}
                  label="Manage instructors"
                  onPress={() => router.push("/(establishment)/instructors")}
                />
                <View className="h-px bg-gray-200" />
                <Row
                  icon={<Feather name="calendar" size={18} color={VIOLET} />}
                  label="Bookings"
                  onPress={() => router.push("/(establishment)/bookings")}
                />
              </View>
            </View>

            {/* Support / logout – same design language */}
            <View className="px-5 mt-10">
              <SectionTitle>Support</SectionTitle>
              <View className="rounded-2xl border border-gray-200 bg-white px-4">
                <Row
                  icon={<Feather name="log-out" size={18} color="#DC2626" />}
                  label="Log out"
                  danger
                  onPress={handleSignOut}
                />
              </View>
            </View>

            {/* Version footer (optional) */}
            <View className="px-5 mt-10 items-center opacity-60">
              <Text className="text-[12px] text-gray-500">App v1.0.0</Text>
            </View>
          </ScrollView>

          {/* EDIT PROFILE MODAL */}
          <Modal
            transparent
            visible={editProfileVisible}
            animationType="slide"
            onRequestClose={() => {
              resetEditForm();
              setEditProfileVisible(false)}}
          >
            <Pressable
              className="flex-1 bg-black/40"
              onPress={() => {
                resetEditForm();
                setEditProfileVisible(false)}}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1 justify-center px-6"
              >
                <Pressable
                  className="rounded-3xl bg-white px-5 py-5"
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    Edit establishment
                  </Text>
                  <Text className="text-xs text-gray-500 mb-4">
                    Update your establishment name, contact info, location and
                    profile photo.
                  </Text>

                  {/* Photo change (only available from modal) */}
                  <View className="items-center mb-4">
                    <TouchableOpacity
                      onPress={handleChangePhoto}
                      activeOpacity={0.85}
                    >
                      <View className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                        {uploadingImage ? (
                          <View className="flex-1 items-center justify-center">
                            <ActivityIndicator />
                          </View>
                        ) : (
                          <Image
                            source={{ uri: previewImageUri }}
                            className="w-full h-full"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text className="mt-2 text-[12px] text-violet-700 font-medium">
                      Change photo
                    </Text>
                  </View>

                  {/* Name */}
                  <View className="mb-3">
                    <Text className="text-[13px] text-gray-600 mb-1">Name</Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900"
                      placeholder="Establishment name"
                      value={editName}
                      onChangeText={setEditName}
                    />
                  </View>

                  {/* Email */}
                  <View className="mb-3">
                    <Text className="text-[13px] text-gray-600 mb-1">Email</Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900"
                      placeholder="Contact / login email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={editEmail}
                      onChangeText={setEditEmail}
                    />
                    <Text className="mt-1 text-[11px] text-gray-400">
                      Changing this will also update your login email and require
                      re-verification.
                    </Text>
                  </View>

                  {/* Phone */}
                  <View className="mb-3">
                    <Text className="text-[13px] text-gray-600 mb-1">Phone</Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900"
                      placeholder="Contact / login phone"
                      keyboardType="phone-pad"
                      value={editPhone}
                      onChangeText={setEditPhone}
                    />
                    <Text className="mt-1 text-[11px] text-gray-400">
                      Changing this will also update your login phone and require
                      re-verification.
                    </Text>
                  </View>

                  {/* Address */}
                  <View className="mb-3">
                    <Text className="text-[13px] text-gray-600 mb-1">
                      Address
                    </Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900"
                      placeholder="Address or area"
                      value={editAddress}
                      onChangeText={setEditAddress}
                    />
                  </View>

                  {/* Google Maps link → backend parses to update lat/lng */}
                  <View className="mb-4">
                    <Text className="text-[13px] text-gray-600 mb-1">
                      Google Maps link (to update map pin)
                    </Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-gray-900"
                      placeholder="https://maps.google.com/..."
                      value={editMapsUrl}
                      onChangeText={setEditMapsUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text className="mt-1 text-[11px] text-gray-400">
                      Paste a Google Maps link to update the establishment
                      location. Leave empty to keep the current pin.
                    </Text>
                  </View>

                  {/* Buttons */}
                  <View className="flex-row justify-end mt-1">
                    <TouchableOpacity
                      onPress={() => {
                        resetEditForm();
                        setEditProfileVisible(false)}}
                      disabled={savingProfile}
                      className="px-4 py-2 rounded-2xl mr-2 border border-gray-200"
                    >
                      <Text className="text-[13px] font-medium text-gray-900">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-4 py-2 rounded-2xl"
                      style={{
                        backgroundColor: savingProfile ? "#E5E7EB" : VIOLET,
                      }}
                    >
                      {savingProfile ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-[13px] font-semibold text-white">
                          Save changes
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}
