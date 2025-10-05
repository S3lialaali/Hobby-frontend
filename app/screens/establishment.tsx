import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Feather, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { fetchEstablishmentById, clickEstablishment, resolveImageUrl } from '../../api';

// ------------------ Types ------------------
type Activity = {
  id: string;
  name: string;
  duration?: string;
  price: string;
};

type Instructor = {
  id: string;
  name: string;
  avatarUri?: string;
};

type Establishment = {
  id: string;
  name: string;
  heroImageUri: string;
  rating: number;
  ratingCount: number;
  address: string;
  activities: Activity[];
  team: Instructor[];
  about: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  lat?: number | null;
  lng?: number | null;
};

// ------------------ UI helpers ------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[20px] font-bold text-gray-900 mb-4">{children}</Text>;
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  const r = Number.isFinite(rating) ? rating : 0;
  const full = Math.floor(r);
  const hasHalf = r - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'star';
    if (i === full && hasHalf) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View className="flex-row items-center">
      <Text className="text-[14px] font-semibold text-gray-900 mr-3">
        {r.toFixed(1)}
      </Text>
      <View className="flex-row">
        {stars.map((name, idx) => (
          <FontAwesome key={idx} name={name as any} size={14} color="#111" style={{ marginRight: 3 }} />
        ))}
      </View>
      <Text className="ml-2 text-[13px] text-gray-500">({count || 0})</Text>
    </View>
  );
}

type ActivityRowProps = { item: Activity; onBook: (a: Activity) => void };
function ActivityRow({ item, onBook }: ActivityRowProps) {
  return (
    <>
      <View className="py-3">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-4">
            <Text className="text-[16px] font-semibold text-gray-900">{item.name}</Text>
            <Text className="text-[13px] text-gray-900 mt-1">{item.price}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onBook(item)}
            className="px-4 py-2 rounded-full border border-gray-300 bg-white"
          >
            <Text className="text-[13px] font-medium text-gray-900">Book</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View className="h-px bg-gray-200" />
    </>
  );
}

function InstructorCard({ person }: { person: Instructor }) {
  const placeholder = require('../../assets/images/instructors/profile_placeholder.jpeg');
  return (
    <View className="w-24 items-center mr-5">
      <View className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
        <Image source={person.avatarUri ? { uri: person.avatarUri } : placeholder} className="w-full h-full" />
      </View>
      <Text className="mt-2 text-[12px] font-semibold text-gray-900" numberOfLines={1}>
        {person.name}
      </Text>
    </View>
  );
}

function ContactRow({
  icon,
  text,
  onPress,
}: {
  icon: React.ReactNode;
  text: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} className="flex-row items-center py-2">
      <View className="w-6 items-center mr-3">{icon}</View>
      <Text className="text-[14px] text-gray-800">{text}</Text>
    </TouchableOpacity>
  );
}

// ------------------ Helpers (format + adapter) ------------------
const formatBHD = (n: any) => {
  const v = Number(n);
  if (!isFinite(v)) return '';
  return `BHD ${v.toFixed(2)}`;
};

function adaptBackendToUI(row: any): Establishment {
  const hero = resolveImageUrl(row?.image_url || row?.logo_url || '');

  const ratingRaw =
    typeof row?.ratings === 'number' ? row.ratings :
    typeof row?.rating === 'number' ? row.rating :
    Number(row?.ratings) || Number(row?.rating) || 0;
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;

  const ratingCountRaw =
    typeof row?.review_count === 'number' ? row.review_count : Number(row?.review_count) || 0;
  const ratingCount = Number.isFinite(ratingCountRaw) ? ratingCountRaw : 0;

  const activities: Activity[] = Array.isArray(row?.activities)
    ? row.activities.map((a: any) => ({
        id: String(a.id),
        name: a.title || a.name || 'Activity',
        duration: a.duration || undefined,
        price: a.price != null ? formatBHD(a.price) : '',
      }))
    : [];

  const team: Instructor[] = Array.isArray(row?.team)
    ? row.team.map((m: any) => ({
        id: String(m.id),
        name: m.name || 'Instructor',
        avatarUri: resolveImageUrl(m.profile_placeholder),
      }))
    : [];

  return {
    id: String(row?.id ?? ''),
    name: row?.name ?? 'Establishment',
    heroImageUri: hero || '',
    rating,
    ratingCount,
    address: row?.address || '',
    activities,
    team,
    about: row?.description || '',
    contact: {
      phone: row?.phone || undefined,
      email: row?.email || undefined,
      website: row?.website || undefined,
      address: row?.address || undefined,
    },
    lat: (typeof row?.lat === 'number' ? row.lat : Number(row?.lat)) ?? null,
    lng: (typeof row?.lng === 'number' ? row.lng : Number(row?.lng)) ?? null,
  };
}

// Build a Google Maps link (no API key needed)
const buildGoogleMapsUrl = (lat?: number | null, lng?: number | null, name?: string) => {
  if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
    const label = name ? encodeURIComponent(name) : '';
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `&query_place_id=${label}` : ''}`;
  }
  return null;
};

// ------------------ Screen ------------------
export default function EstablishmentScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const insets = useSafeAreaInsets();

  const [est, setEst] = useState<Establishment>({
    id: String(id ?? ''),
    name: String(name ?? '') || 'Establishment',
    heroImageUri: '',
    rating: 0,
    ratingCount: 0,
    address: '',
    activities: [],
    team: [],
    about: '',
    contact: {},
    lat: null,
    lng: null,
  });

  useEffect(() => {
    const estId = Number(id);
    if (!estId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchEstablishmentById(estId);
        if (!cancelled && data) {
          const ui = adaptBackendToUI(data);
          setEst((prev) => ({ ...prev, ...ui }));
        }
      } catch {}
    })();

    clickEstablishment(estId).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  const coords = useMemo(() => {
    if (typeof est.lat === 'number' && typeof est.lng === 'number' && isFinite(est.lat) && isFinite(est.lng)) {
      return { latitude: est.lat as number, longitude: est.lng as number };
    }
    return null;
  }, [est.lat, est.lng]);

  const onBook = (a: Activity) => {
    console.log('Book:', a.id, a.name);
  };

  const openTel = () => est.contact.phone && Linking.openURL(`tel:${est.contact.phone}`);
  const openMail = () => est.contact.email && Linking.openURL(`mailto:${est.contact.email}`);
  const openWeb = () =>
    est.contact.website &&
    Linking.openURL(est.contact.website.startsWith('http') ? est.contact.website : `https://${est.contact.website}`);

  const openDirections = () => {
    const url = buildGoogleMapsUrl(est.lat, est.lng, est.name);
    if (url) Linking.openURL(url);
  };

  const heroSource = est.heroImageUri
    ? { uri: est.heroImageUri }
    : require('../../assets/images/establishment_images/placeholder1.jpeg');

  return (
    <>
      {/* Hide header (removes title & back arrow) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Disable top safe-area inset so the image reaches the very top */}
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Hero image */}
          <View>
            <Image source={heroSource} className="w-full h-72" resizeMode="cover" />

            {/* Back button -> Home (Tabs) */}
            <Link href="/" replace asChild>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                style={{
                  position: 'absolute',
                  left: 16,
                  top: insets.top + 8,
                  zIndex: 10,
                  elevation: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
                className="w-9 h-9 rounded-full bg-white items-center justify-center border border-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Go to Home"
              >
                <Feather name="arrow-left" size={18} color="#000" />
              </TouchableOpacity>
            </Link>
          </View>

          {/* Name + rating + address */}
          <View className="px-5 pt-5">
            <Text className="text-[24px] font-extrabold text-gray-900">{est.name}</Text>
            <View className="mt-3">
              <StarRow rating={est.rating} count={est.ratingCount} />
            </View>
            <View className="flex-row items-center mt-3">
              <Feather name="map-pin" size={14} color="#6b7280" />
              <Text className="ml-2 text-[13px] text-gray-600">{est.address}</Text>
            </View>
          </View>

          {/* Activities */}
          <View className="px-5 mt-8">
            <SectionTitle>Activities</SectionTitle>
            <View className="h-px bg-gray-200" />
            {est.activities.map((a) => (
              <ActivityRow key={a.id} item={a} onBook={onBook} />
            ))}
          </View>

          {/* The team */}
          <View className="px-5 mt-10">
            <SectionTitle>The team</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
              {est.team.map((p) => (
                <InstructorCard key={p.id} person={p} />
              ))}
            </ScrollView>
          </View>

          {/* About */}
          <View className="px-5 mt-10">
            <SectionTitle>About</SectionTitle>
            <Text className="text-[14px] leading-5 text-gray-800">
              {est.about}
            </Text>
          </View>

          {/* Native map (fixed to the pin) */}
          <View className="px-5 mt-10">
            <View className="w-full h-56 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              {coords && (
                <MapView
                  style={{ width: '100%', height: '100%' }}
                  region={{
                    ...coords,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  showsCompass={false}
                  toolbarEnabled={false}
                >
                  <Marker coordinate={coords} title={est.name} />
                </MapView>
              )}
            </View>

            {/* Get Directions link under the map */}
            {coords && (
              <TouchableOpacity
                onPress={openDirections}
                activeOpacity={0.7}
                className="mt-3"
              >
                <Text className="text-[14px] underline" style={{ color: '#7C3AED' }}>
                  Get Directions
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact */}
          <View className="px-5 mt-10 mb-8">
            <SectionTitle>Contact</SectionTitle>
            {est.contact.phone && (
              <ContactRow icon={<Feather name="phone" size={18} color="#111" />} text={est.contact.phone} onPress={openTel} />
            )}
            {est.contact.email && (
              <ContactRow icon={<Feather name="mail" size={18} color="#111" />} text={est.contact.email} onPress={openMail} />
            )}
            {est.contact.address && (
              <ContactRow icon={<MaterialIcons name="location-on" size={18} color="#111" />} text={est.contact.address} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
