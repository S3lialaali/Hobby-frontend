import React from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";

type LatLng = { lat: number; lng: number } | null;

function parseLatLngFromGoogleMapsUrl(url: string): LatLng {
  try {
    const decoded = decodeURIComponent(url.trim());

    // 1) @lat,lng pattern
    const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }

    // 2) q=lat,lng or ll=lat,lng
    const qMatch = decoded.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }

    // 3) q=loc:lat,lng
    const qLoc = decoded.match(/[?&]q=loc:(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (qLoc) {
      const lat = parseFloat(qLoc[1]);
      const lng = parseFloat(qLoc[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }

    return null;
  } catch {
    return null;
  }
}

export default function SignupBusiness() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [mapsUrl, setMapsUrl] = React.useState("");
  const [latLng, setLatLng] = React.useState<LatLng>(null);

  // Address fields: Country – City – Block – Road – Address
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [block, setBlock] = React.useState("");
  const [road, setRoad] = React.useState("");
  const [address, setAddress] = React.useState("");

  React.useEffect(() => {
    setLatLng(parseLatLngFromGoogleMapsUrl(mapsUrl));
  }, [mapsUrl]);

  const createAccount = () => {
    // Later: call /auth/signup with role="business" and include { lat,lng, address parts }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-8">
          <Text className="text-3xl font-bold text-[#1F4278] mb-8 text-center">Sign up (Business)</Text>

          <View className="w-full gap-4">
            <View>
              <Text className="text-base text-[#143052] mb-2">Business name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your establishment name" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="business@example.com" keyboardType="email-address" autoCapitalize="none" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Phone (optional)</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="+973 3xxxxxxx" keyboardType="phone-pad" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Google Maps link (required)</Text>
              <TextInput
                value={mapsUrl}
                onChangeText={setMapsUrl}
                placeholder="Paste Google Maps link with location"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base"
              />
              <Text className="text-sm text-gray-600 mt-2">
                {latLng
                  ? `Parsed lat/lng: ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
                  : "Tip: Paste a link like https://maps.google.com/?q=26.1234,50.5678 or a place link with @lat,lng"}
              </Text>
            </View>

            {/* Address */}
            <View className="mt-2">
              <Text className="text-base text-[#143052] mb-2">Address</Text>
              <Text className="text-xs text-gray-600 mb-2">Format: Country – City – Block – Road – Address</Text>

              <TextInput value={country} onChangeText={setCountry} placeholder="Country" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base mb-2" />
              <TextInput value={city} onChangeText={setCity} placeholder="City" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base mb-2" />
              <TextInput value={block} onChangeText={setBlock} placeholder="Block" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base mb-2" />
              <TextInput value={road} onChangeText={setRoad} placeholder="Road" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base mb-2" />
              <TextInput value={address} onChangeText={setAddress} placeholder="Address / Building / Unit" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <TouchableOpacity onPress={createAccount} className="mt-3 rounded-2xl bg-[#1F4278] py-3 items-center">
              <Text className="text-white text-base font-semibold">Sign up as business</Text>
            </TouchableOpacity>

            <Link href="./role" replace className="text-center text-[#1F4278] mt-3">Back</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
