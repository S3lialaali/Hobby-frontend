import React, { useState, useMemo} from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Link, router } from "expo-router";
import { registerBusiness } from "@/api/auth";
import { getApiError } from "@/api/client";

//function to parse latitude and longitude from google maps urls
function parseGoogleMapsLatLng(url: string): { lat: number; lng: number } | null {
  try {
    //1- lat, lng, zoom patter regex
    const atMatch = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    //2- query parmeters 
    const u = new URL(url);
    const q = u.searchParams.get("q") || u.searchParams.get("query");
    if (q) {
      const parts = q.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng};
      }
    }

    //3- place links
    const bangMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (bangMatch) {
      const lat = parseFloat(bangMatch[1]);
      const lng = parseFloat(bangMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng};
    }
    return null;
  } catch {
    return null;
  }
}

//function to display address in format: Country – City – Block – Road – Address
function buildFormattedAddress(country: string, city: string, block: string, road: string, address: string) {
  const parts = [country, city, block, road, address].map(s => (s || "").trim());
  return `[ ${parts.join(", ")} ]`;
}

export default function SignupBusiness() {
  //account info
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  //establishment info 
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Address fields: Country – City – Block – Road – Address
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [block, setBlock] = useState("");
  const [road, setRoad] = useState("");
  const [address, setAddress] = useState("");

  //google maps url
  const [mapUrl, setMapUrl] = useState("");
  const coords = useMemo(() => (mapUrl ? parseGoogleMapsLatLng(mapUrl) : null), [mapUrl]);
  const formattedAddress = useMemo(() => buildFormattedAddress(country, city, block, road, address), [country, city, block, road, address]);

  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    //add more fields later this is enough for now 
    if (!username || !email || !password || !name) {
      Alert.alert("Missing info", "Username, emaiil, password, and establishment name are required.");
      return;
    }
    //require valig google maps link for location
    if (!mapUrl || !coords) {
      Alert.alert("Location required", "Paste a valid Google Maps link so we can get your business location.");
      return;
    }

    const { lat, lng } = coords;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Invalid coordinates", "Please provide a valid Google Maps link.");
      return;
    }

    setLoading(true);
    try {
      await registerBusiness({
        username,
        email,
        password,
        phone: phone || null,
        establishment_name: name,
        establishment_description: description || null,
        establishment_category: category || null,
        establishment_address: formattedAddress,
        lat, lng,
      });
      Alert.alert("Application submitted", "Your business is pending approval. You will be notified once it's approved.",
        [{ text: "OK", onPress: () => router.replace("/screens/login")}]
      );
    } catch (err) {
      const msg = getApiError(err);
      if (msg === "email_or_username_exists" || msg === "conflict") {
        Alert.alert("Already registered", "Email or username already exists.");
      } else {
        Alert.alert("Signup failed", msg);
      }
    } finally {
      setLoading(false);
    }
  }

    return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // adjust if you have a header
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }} // extra bottom space so last inputs aren’t hidden
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <Text className="text-xl font-semibold mb-3">Register your establishment</Text>

        {/* Account */}
        <Text className="font-semibold mt-1 mb-2">Account</Text>
        <TextInput
          placeholder="Username (e.g., bahrain-fitness)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Email (e.g., owner@center.com)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Phone (e.g., +9733xxxxxxx)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Password (min 8 chars)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="border rounded-xl px-4 py-3 mb-4"
        />

        {/* Establishment */}
        <Text className="font-semibold mt-1 mb-2">Establishment</Text>
        <TextInput
          placeholder="Establishment name*"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={name}
          onChangeText={setName}
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Description (courses, facilities, etc.)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={description}
          onChangeText={setDescription}
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Category (e.g., Water activities, Football)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={category}
          onChangeText={setCategory}
          className="border rounded-xl px-4 py-3 mb-3"
        />

        {/* Address components */}
        <Text className="font-semibold mt-1 mb-2">Address (separate fields)</Text>
        <TextInput
          placeholder="Country (e.g., Bahrain)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={country}
          onChangeText={setCountry}
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="City (e.g., Manama)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={city}
          onChangeText={setCity}
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Block (e.g., 338)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={block}
          onChangeText={setBlock}
          keyboardType="numeric"
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Road (e.g., 1705)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={road}
          onChangeText={setRoad}
          className="border rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          placeholder="Address (building/floor/apartment)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={address}
          onChangeText={setAddress}
          className="border rounded-xl px-4 py-3 mb-2"
        />
        <Text className="text-gray-600 mb-4">Formatted: {formattedAddress}</Text>

        {/* Google Maps link → lat/lng */}
        <Text className="font-semibold mt-1 mb-2">Location</Text>
        <TextInput
          placeholder="Paste full Google Maps link (must include @lat,lng or ?q=lat,lng)"
          placeholderTextColor="rgba(60,60,67,0.6)"
          value={mapUrl}
          onChangeText={setMapUrl}
          autoCapitalize="none"
          className="border rounded-xl px-4 py-3 mb-2"
        />
        <Text className="text-gray-600 mb-4">
          {coords ? `Detected: lat ${coords.lat.toFixed(6)}, lng ${coords.lng.toFixed(6)}` : "No coordinates detected yet"}
        </Text>

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="bg-black rounded-xl px-4 py-3 items-center mb-10"
        >
          {loading ? <ActivityIndicator /> : <Text className="text-white font-semibold">Submit</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}