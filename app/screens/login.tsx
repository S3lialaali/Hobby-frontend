import { Link, router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View, Alert, Pressable, ActivityIndicator } from "react-native";
import { login } from "../../api/auth";
import { getApiError, setAccessToken } from "../../api/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState(""); //email OR phone
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!identifier || !password) {
      Alert.alert("Missing fields", "Please neter yout email/phone number and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await login({ identifier, password});
      setAccessToken(response.accessToken);
      console.log("LOGIN RESPONSE ->", response);
      if (response.business && response.business.status !== "approved") {
        Alert.alert("Pending approval", "Your business is still awaiting approval.");
        //We can place optional pending screen here router.replace("/screens/pending");
      } else {
        router.replace("/(tabs)"); //redirect to home page
      }
    } catch (err) {
      Alert.alert("Login failed", getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 p-5 justify-center">
      <Text className="text-xl font-semibold mb-3">Sign in</Text>

      <TextInput
        placeholder="Email or phone"
        autoCapitalize="none"
        keyboardType="email-address"
        value={identifier}
        onChangeText={setIdentifier}
        className="border rounded-xl px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border rounded-xl px-4 py-3 mb-4"
      />

      <Pressable onPress={onSubmit} disabled={loading} className="bg-black rounded-xl px-4 py-3 items-center">
        {loading ? <ActivityIndicator /> : <Text className="text-white font-semibold">Login</Text>}
      </Pressable>
      {/* Sign up link -> role.tsx */}
      <Pressable onPress={() => router.push("/screens/signup/role")} className="mt-4 items-center">
        <Text className="text-blue-600">Don’t have an account? Sign up</Text>
      </Pressable>

    </View>
  );
}
