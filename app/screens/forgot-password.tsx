import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { router } from "expo-router";
import { getApiError } from "@/api/client";
import { requestPasswordReset } from "@/api/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = email.trim();

    if (!trimmed) {
      Alert.alert("Missing email", "Please enter the email for your account.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(trimmed);

      Alert.alert(
        "Check your email",
        "If an account exists for this email, we’ve sent a password reset link.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/screens/login"),
          },
        ]
      );
    } catch (err) {
      const msg = getApiError(err);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 p-5 justify-center bg-white">
        <Text className="text-2xl font-semibold mb-2">Forgot password</Text>
        <Text className="text-gray-600 mb-6">
          Enter the email associated with your Hobby account and we’ll send you
          a link to reset your password.
        </Text>

        <Text className="text-sm font-medium mb-1">Email</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="border rounded-xl px-4 py-3 mb-4"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="bg-black rounded-xl px-4 py-3 items-center"
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Send reset link</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace("/screens/login")}
          className="items-center mt-4"
        >
          <Text className="text-violet-600 underline">Back to login</Text>
        </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}
