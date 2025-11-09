import React from 'react';
import {View,Text,ScrollView,Image,TouchableOpacity,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

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
          className={`text-[15px] ${danger ? 'text-red-600 font-semibold' : 'text-gray-900 font-medium'}`}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        {value ? <Text className="text-[13px] text-gray-500 mr-2">{value}</Text> : null}
        {!danger ? <Feather name="chevron-right" size={18} color="#9CA3AF" /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  // Hardcoded for now; replace with your auth/user store later
  const user = {
    id: 2,
    name: 'Ali',
    username: 'ali',
    email: 'ali@example.com',
    avatar: null as string | null,
  };

  const avatarSource = user.avatar
    ? { uri: user.avatar }
    : require('../../assets/images/instructors/profile_placeholder.jpeg');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
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
                    {user.name}
                  </Text>
                  <Text className="text-[13px] text-gray-600" numberOfLines={1}>
                    @{user.username}
                  </Text>
                </View>

                {/* Edit button (stub) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  className="px-3 py-2 rounded-full border"
                  style={{ borderColor: VIOLET }}
                  onPress={() => {
                    // Wire to your edit profile screen when ready
                  }}
                >
                  <Text className="text-[13px] font-semibold" style={{ color: VIOLET }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick stats (optional placeholders) */}
              <View className="mt-5 flex-row">
                <View className="flex-1 items-center">
                  <Text className="text-[18px] font-extrabold text-gray-900">—</Text>
                  <Text className="text-[12px] text-gray-500">Upcoming</Text>
                </View>
                <View className="w-px bg-gray-200 mx-4" />
                <View className="flex-1 items-center">
                  <Text className="text-[18px] font-extrabold text-gray-900">—</Text>
                  <Text className="text-[12px] text-gray-500">Past</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Account */}
          <View className="px-5 mt-10">
            <SectionTitle>Account</SectionTitle>
            <View className="rounded-2xl border border-gray-200 bg-white px-4">
            
              <View className="h-px bg-gray-200" />
              <Row
                icon={<Feather name="at-sign" size={18} color={VIOLET} />}
                label="Username"
                value={user.username}
                onPress={() => {}}
              />
              <View className="h-px bg-gray-200" />
              <Row
                icon={<Feather name="mail" size={18} color={VIOLET} />}
                label="Email"
                value={user.email}
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Activity / Actions */}
          <View className="px-5 mt-10">
            <SectionTitle>Activity</SectionTitle>
            <View className="rounded-2xl border border-gray-200 bg-white px-4">
              <Row
                icon={<Feather name="calendar" size={18} color={VIOLET} />}
                label="My bookings"
                onPress={() => router.push('/(tabs)/booking')}
              />
              <Row
                icon={<Feather name="star" size={18} color={VIOLET} />}
                label="My ratings"
                onPress={() => router.push('/(tabs)/booking')}
              />
              <View className="h-px bg-gray-200" />
              <Row
                icon={<Feather name="search" size={18} color={VIOLET} />}
                label="Find activities"
                onPress={() => router.push('/(tabs)/search')}
              />
            </View>
          </View>

          

          {/* Support / Danger */}
          <View className="px-5 mt-10">
            <SectionTitle>Support</SectionTitle>
            <View className="rounded-2xl border border-gray-200 bg-white px-4">
              <Row
                icon={<Feather name="help-circle" size={18} color={VIOLET} />}
                label="Help & FAQ"
                onPress={() => {}}
              />
              <View className="h-px bg-gray-200" />
              <Row
                icon={<Feather name="alert-triangle" size={18} color={VIOLET} />}
                label="Report a problem"
                onPress={() => {}}
              />
            </View>

            <View className="mt-4 rounded-2xl border border-gray-200 bg-white px-4">
              <Row
                icon={<Feather name="log-out" size={18} color="#DC2626" />}
                label="Log out"
                danger
                onPress={() => {
                  // Hook into your auth/sign-out flow
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
    </>
  );
}
