import React from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";

export default function SignupUser() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const createAccount = () => {
    // Later: call /auth/signup with role="user"
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-8">
          <Text className="text-3xl font-bold text-[#1F4278] mb-8">Sign up (User)</Text>

          <View className="w-full gap-4">
            <View>
              <Text className="text-base text-[#143052] mb-2">Full name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your name" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <View>
              <Text className="text-base text-[#143052] mb-2">Confirm password</Text>
              <TextInput value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-base" />
            </View>

            <TouchableOpacity onPress={createAccount} className="mt-2 rounded-2xl bg-[#1F4278] py-3 items-center">
              <Text className="text-white text-base font-semibold">Sign up</Text>
            </TouchableOpacity>

            <Link href="./role" replace className="text-center text-[#1F4278] mt-3">Back</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
