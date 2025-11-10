import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function ChooseRole() {
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-3xl font-bold text-[#1F4278] mb-8 text-center">Create your account</Text>
      <Text className="text-base text-gray-700 mb-6 text-center">Choose what kind of user you are</Text>

      <View className="w-full gap-4">
        <Link href="./user" replace asChild>
          <TouchableOpacity className="rounded-2xl border border-gray-300 py-4 items-center">
            <Text className="text-lg font-semibold text-[#1F4278]">I&apos;m a User</Text>
          </TouchableOpacity>
        </Link>

        <Link href="./business" replace asChild>
          <TouchableOpacity className="rounded-2xl bg-[#1F4278] py-4 items-center">
            <Text className="text-lg font-semibold text-white">I&apos;m a Business</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="absolute bottom-10 left-0 right-0 items-center">
        <Link href="../login" className="text-[#E1B127] font-semibold">Back to login</Link>
      </View>
    </View>
  );
}
