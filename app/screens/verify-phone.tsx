import React, { useEffect, useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/sessions/AuthContext";
import { getApiError } from "@/api/client";

export default function VerifyPhoneScreen() {
  const { user, sendPhoneVerification, verifyPhoneCode } = useAuth();
  const params = useLocalSearchParams<{ phone?: string }>();

  // Prefer phone from params, fallback to logged-in user
  const initialPhone =
    (params.phone as string) || (user?.phone as string) || "";

  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const sentOnceRef = useRef(false);

  // Auto-send code once when screen mounts and we have a phone
  useEffect(() => {
    if (!phone || sentOnceRef.current) return;

    sentOnceRef.current = true;
    (async () => {
      try {
        setSending(true);
        await sendPhoneVerification(phone);
        Alert.alert(
          "Verification code sent",
          `We've sent a verification code to ${phone}.`
        );
      } catch (err: any) {
        const msg = getApiError(err) ?? "Failed to send verification code.";
        Alert.alert("Error", msg);
      } finally {
        setSending(false);
      }
    })();
  }, [phone, sendPhoneVerification]);

  async function handleResend() {
    if (!phone) {
      Alert.alert("Missing phone", "Please enter your phone number first.");
      return;
    }
    try {
      setSending(true);
      await sendPhoneVerification(phone);
      Alert.alert(
        "Verification code sent",
        `We've sent a new verification code to ${phone}.`
      );
    } catch (err: any) {
      const msg = getApiError(err) ?? "Failed to resend verification code.";
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (!phone || !code.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter both your phone number and the verification code."
      );
      return;
    }

    try {
      setLoading(true);
      const res = await verifyPhoneCode({phone, code: code.trim()});
      const user = res?.user;

      if(!user) {
        Alert.alert("Error", "Unexpected response from server.");
      }

      if (res?.message === "phone_verified" || user.is_phone_verified) {
        const role = user.role;

        Alert.alert(
          "Phone verified",
          "Your phone number has been successfully verified.",
          [
            {
              text: "Continue",
              onPress: () => {
                if (role === "business") {
                  // You can adjust the destination if needed
                  router.replace("/(establishment)/dashboard");
                } else {
                  router.replace("/(tabs)");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Unexpected response",
          "Verification did not complete as expected."
        );
      }
    } catch (err: any) {
      const codeStr = getApiError(err);
      if (codeStr === "invalid_code") {
        Alert.alert("Invalid code", "The code you entered is incorrect.");
      } else if (codeStr === "code_expired") {
        Alert.alert(
          "Code expired",
          "This code has expired. Please request a new one."
        );
      } else if (codeStr === "code_already_used") {
        Alert.alert(
          "Code already used",
          "This code was already used. Please request a new one."
        );
      } else {
        const msg = codeStr ?? "Failed to verify phone. Please try again.";
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    // Back to profile or previous screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/screens/login");
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white px-6 py-10">
        <Text className="text-2xl font-bold mb-4 text-gray-900">
          Verify your phone
        </Text>
        <Text className="text-gray-700 mb-6">
          Enter your phone number and the 6-digit code we sent via SMS.
        </Text>

        {/* Phone input (editable in case user wants to correct it) */}
        <View className="mb-4">
          <Text className="text-gray-800 mb-2">Phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +9733xxxxxxx"
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
          />
        </View>

        {/* Code input */}
        <View className="mb-6">
          <Text className="text-gray-800 mb-2">Verification code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 tracking-[4px]"
          />
        </View>

        {/* Verify button */}
        <Pressable
          onPress={handleVerify}
          disabled={loading || !phone || !code}
          className={`rounded-lg py-3 items-center mb-4 ${
            loading || !phone || !code ? "bg-gray-300" : "bg-blue-600"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Verify phone</Text>
          )}
        </Pressable>

        {/* Resend code */}
        <Pressable onPress={handleResend} disabled={sending}>
          {sending ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" />
              <Text className="ml-2 text-gray-600">Sending...</Text>
            </View>
          ) : (
            <Text className="text-blue-600">Resend code</Text>
          )}
        </Pressable>

        {/* Back link */}
        <Pressable onPress={handleBack} className="items-center mt-4">
          <Text className="text-gray-600 underline">Back</Text>
        </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}
