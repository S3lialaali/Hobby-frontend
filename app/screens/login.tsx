import { Link, router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const enterApp = () => {
    // Allow any input (even empty) to pass into app
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      className="flex-1 bg-white"
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-[#1F4278] mb-8">Welcome to Hobby!</Text>

        <View className="w-full gap-4">
          <View>
            <Text className="text-base text-[#143052] mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base"
            />
          </View>

          <View>
            <Text className="text-base text-[#143052] mb-2">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base"
            />
          </View>

          <TouchableOpacity onPress={enterApp} className="mt-2 rounded-2xl bg-[#1F4278] py-3 items-center">
            <Text className="text-white text-base font-semibold">Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={enterApp} className="rounded-2xl border border-[#E1B127] py-3 items-center">
            <Text className="text-[#1F4278] text-base font-semibold">Continue without account</Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-10 left-0 right-0 items-center">
          <Text className="text-gray-700">
            Don't have an account?{" "}
            <Link href="./register/role" replace className="text-[#E1B127] font-semibold">
                Sign up
            </Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
