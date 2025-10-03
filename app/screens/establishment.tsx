import React, { useMemo } from 'react';
import {View,Text,ScrollView,Image,TouchableOpacity,Linking,Platform,} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Feather, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

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
  role?: string;
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
};

// ------------------ Mock (replace with API later) ------------------
const mockEstablishment: Establishment = {
  id: 'est-001',
  name: 'Milli Trims',
  heroImageUri: 'https://picsum.photos/1200/800',
  rating: 4.9,
  ratingCount: 116,
  address: 'saar centre, Saar',
  activities: [
    { id: 'a1', name: 'Haircut & Beard Trim (with washing)', price: 'BHD 6.50' },
    { id: 'a2', name: 'Hair Cut', price: 'BHD 4.50' },
    { id: 'a3', name: 'Kids Haircut (under 12 years)', price: 'BHD 3.50' },
    { id: 'a4', name: 'Beard Trim', price: 'BHD 3.50' },
  ],
  team: [
    { id: 't1', name: 'Ali Hasan' },
    { id: 't2', name: 'Mo Noor' },
    { id: 't3', name: 'Zaid Ahmed' },
    { id: 't4', name: 'Faisal Rahim' },
  ],
  about:
    "Your go-to place for modern barbering. We blend sophistication with comfort, ensuring every visit is enjoyable. Whether you're after a classic cut or a trendy new style, we cater to all tastes with precision and flair.",
  contact: {
    phone: '+973 3333 3333',
    email: 'hello@millitrims.example',
    website: 'https://millitrims.example',
    address: 'saar centre, Saar, Bahrain',
  },
};

// University of Bahrain coords (from earlier)
const UOB_COORDS = { latitude: 26.0509557, longitude: 50.5108481 };

// Light map style (Android / Google Maps only)
const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f3e9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e7ff' }] },
];

// ------------------ UI helpers ------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[20px] font-bold text-gray-900 mb-4">{children}</Text>;
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'star';
    if (i === full && hasHalf) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View className="flex-row items-center">
      {/* Left: rating number */}
      <Text className="text-[14px] font-semibold text-gray-900 mr-3">
        {rating.toFixed(1)}
      </Text>

      {/* Stars */}
      <View className="flex-row">
        {stars.map((name, idx) => (
          <FontAwesome
            key={idx}
            name={name as any}
            size={14}
            color="#111"
            style={{ marginRight: 3 }}
          />
        ))}
      </View>

      {/* Count: a bit to the right of the stars */}
      <Text className="ml-2 text-[13px] text-gray-500">({count})</Text>
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

// ------------------ Screen ------------------
export default function EstablishmentScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const insets = useSafeAreaInsets();

  const est: Establishment = {
    ...mockEstablishment,
    id: id ?? mockEstablishment.id,
    name: name ?? mockEstablishment.name,
  };

  const onBook = (a: Activity) => {
    console.log('Book:', a.id, a.name);
  };

  const openTel = () => est.contact.phone && Linking.openURL(`tel:${est.contact.phone}`);
  const openMail = () => est.contact.email && Linking.openURL(`mailto:${est.contact.email}`);
  const openWeb = () =>
    est.contact.website &&
    Linking.openURL(est.contact.website.startsWith('http') ? est.contact.website : `https://${est.contact.website}`);

  return (
    <>
      {/* Hide header (removes title & back arrow) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Disable top safe-area inset so the image reaches the very top */}
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Hero image */}
          <View>
            <Image source={{ uri: est.heroImageUri }} className="w-full h-72" resizeMode="cover" />

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

          {/* Native map  */}
          <View className="px-5 mt-10">
            <View className="w-full h-56 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              <MapView
                style={{ width: '100%', height: '100%' }}
                initialRegion={{
                  ...UOB_COORDS,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                mapType={Platform.OS === 'ios' ? ('mutedStandard' as any) : 'standard'}
                customMapStyle={Platform.OS === 'android' ? LIGHT_MAP_STYLE : []}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsCompass={false}
                toolbarEnabled={false}
                liteMode
              >
                <Marker coordinate={UOB_COORDS} title="University of Bahrain" />
              </MapView>
            </View>
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
