import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Pressable} from "react-native";
import { Link, router } from "expo-router";
import { registerUser} from "../../../api/auth";
import { getApiError } from "../../../api/client";

export default function SignupUser() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!username || !email || !password) {
      Alert.alert("Missing fields", "Username, email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const response = await registerUser({ 
        username, 
        email,
        password,
        phone: phone || null,
      });
      if (response?.message === "user_created") {
        router.replace("/(tabs)")
      } else {
        Alert.alert("Signup", "Account created.");
        router.replace("/(tabs)");
      }
    } catch (err) {
      const msg = getApiError(err);
      if (msg === "email_or_username_exists" || msg === "conflict") {
        Alert.alert("Already registered", "Email or username already exists.");
      } else {
        Alert.alert("Signup failed", msg)
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 p-5 justify-center">
      <Text className="text-xl font-semibold mb-3">Create an account</Text>

      <TextInput
        placeholder="Username (e.g., hassan97)"
        placeholderTextColor="rgba(60,60,67,0.6)"
        value={username}
        onChangeText={setUsername}
        className="border rounded-xl px-4 py-3 mb-3"
      />

      <TextInput
        placeholder="Email (e.g., you@example.com)"
        placeholderTextColor="rgba(60,60,67,0.6)"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="border rounded-xl px-4 py-3 mb-3"
      />

      <TextInput
        placeholder="Phone (optional, e.g., +9733xxxxxxx)"
        placeholderTextColor="rgba(60,60,67,0.6)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        className="border rounded-xl px-4 py-3 mb-3"
      />

      <TextInput
        placeholder="Password (min 8 chars)"
        placeholderTextColor="rgba(60,60,67,0.6)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border rounded-xl px-4 py-3 mb-4"
      />

      <Pressable onPress={onSubmit} disabled={loading} className="bg-black rounded-xl px-4 py-3 items-center">
        {loading ? <ActivityIndicator /> : <Text className="text-white font-semibold">Create account</Text>}
      </Pressable>
    </View>
  );
}
