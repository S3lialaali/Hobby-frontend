import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert,Keyboard, TouchableWithoutFeedback } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/sessions/AuthContext";
import { getApiError } from "@/api/client";

export default function VerifyEmailScreen() {
  const { user, sendEmailVerification, verifyEmailCode } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  // Prefer email from params, fallback to logged-in user
  const initialEmail = (params.email as string) || (user?.email as string) || "";

  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Auto-send code once when screen opens (if we have an email)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      try {
        setSending(true);
        await sendEmailVerification(email);
        if (!cancelled) {
          console.log("[VerifyEmail] initial code sent to", email);
        }
      } catch (err) {
        console.warn("Failed to send verification email:", err);
      } finally {
        if (!cancelled) setSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, sendEmailVerification]);

  async function handleResend() {
    if (!email) {
      Alert.alert("Missing email", "We don't know which email to verify.");
      return;
    }
    try {
      setSending(true);
      await sendEmailVerification(email);
      Alert.alert("Verification email sent", "Please check your inbox for the new code.");
    } catch (err) {
      Alert.alert("Error", getApiError(err));
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (!email || !code.trim()) {
      Alert.alert("Missing fields", "Please enter the code we sent to your email.");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyEmailCode({ email, code: code.trim() });

      if (res?.message === "email_verified" || res?.user?.is_email_verified) {
        const role = res?.user?.role;

        Alert.alert("Email verified", "Your email has been successfully verified.", [
          {
            text: "Continue",
            onPress: () => {
              if (role === "business") {
                router.replace("/(establishment)/dashboard");
              } else {
                router.replace("/(tabs)");
              }
            },
          },
        ]);
      } else {
        Alert.alert("Verification", "Could not verify your email. Please check the code and try again.");
      }
    } catch (err) {
      const msg = getApiError(err);
      if (msg === "invalid_code") {
        Alert.alert("Invalid code", "The code you entered is not correct.");
      } else if (msg === "code_expired") {
        Alert.alert("Code expired", "Please request a new code and try again.");
      } else if (msg === "code_already_used") {
        Alert.alert("Code used", "This code has already been used. Request a new one.");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-lg font-semibold mb-2">No email to verify</Text>
        <Text className="text-gray-600 mb-4 text-center">
          We couldn't determine which email belongs to this account. Please go back and login or sign up again.
        </Text>
        <Pressable
          onPress={() => router.replace("/screens/login")}
          className="bg-black px-4 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Back to login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 justify-center px-5">
        <Text className="text-2xl font-semibold mb-2">Verify your email</Text>
        <Text className="text-gray-600 mb-4">
          We’ve sent a 6-digit verification code to{" "}
          <Text className="font-semibold">{email}</Text>. Enter it below to verify your account.
        </Text>

        <TextInput
          placeholder="6-digit code"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
          className="border rounded-xl px-4 py-3 mb-3 text-center text-lg tracking-[4px]"
        />

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          className="bg-black rounded-xl px-4 py-3 items-center mb-3"
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Verify email</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleResend}
          disabled={sending}
          className="items-center mt-1"
        >
          {sending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-blue-600">Resend code</Text>
          )}
        </Pressable>
        <Pressable
        onPress={() => router.replace("/screens/login")}
        className="items-center mt-2"
      >
        <Text className="text-gray-600 underline">Back to login</Text>
      </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}
