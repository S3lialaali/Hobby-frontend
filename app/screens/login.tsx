import { Link, router } from "expo-router";
import React, { useState } from "react";
import {KeyboardAvoidingView,Platform,Text,TextInput,TouchableOpacity,View,Alert,Pressable,ActivityIndicator,} from "react-native";
import { getApiError } from "../../api/client";
import { useAuth } from "../../sessions/AuthContext";

export default function LoginScreen() {
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState(""); // email OR phone
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();

  async function onSubmit() {
    if (!identifier || !password) {
      Alert.alert("Missing fields", "Please enter your email/phone number and password.");
      return;
    }
    setLoading(true);
    try {
      // Use the context so it sets user + tokens and updates the UI state
      const data = await signIn({ identifier, password });

      const user = data?.user;

      // If email is not verified, force user to the verify email screen
      if (user && !user.is_email_verified) {
        Alert.alert(
          "Verify your email",
          "Please verify your email before using the app.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace({
                  pathname: "/screens/verify-email",
                  params: { email: user.email },
                }),
            },
          ]
        );
        return; // stop here, don't route to tabs/establishment yet
      }

      //After email is verified, require phone verification
      if (!user.is_phone_verified) {
        Alert.alert(
          "Verify your phone",
          "Please verify your phone number to continue."
        );
        router.replace({
          pathname: "/screens/verify-phone",
          params: { phone: user.phone },
        });
        return;
      }

      // Prefer business status from the response; fall back to context if needed
      const role = data?.user?.role ?? null;
      const businessStatus = data?.business?.status ?? null;
      
      if (role === "business"){
        if (businessStatus && businessStatus !== "approved") {
          Alert.alert(
            "Pending approval",
            "Your business is still awaiting approval."
          );
        }
          router.replace("/(establishment)/dashboard");
        }else if(role=="admin"){
          router.replace("/(admin)/dashboard");
        } else {
          router.replace("/(tabs)");
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
        placeholderTextColor="grey"
        placeholder="Email or phone"
        autoCapitalize="none"
        keyboardType="email-address"
        value={identifier}
        onChangeText={setIdentifier}
        className="border rounded-xl px-4 py-3 mb-3"
      />
      <TextInput
        placeholderTextColor="grey"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border rounded-xl px-4 py-3 mb-4"
      />

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="bg-black rounded-xl px-4 py-3 items-center"
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-white font-semibold">Login</Text>
        )}
      </Pressable>

      {/* Sign up link -> role.tsx */}
      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">Don&apos;t have an account? </Text>

        <Pressable onPress={() => router.push("/screens/signup/role")}>
          <Text className="text-violet-600 underline font-semibold">
            Sign up
          </Text>
        </Pressable>
      </View>

      {/* Forgot password link */}
      <Pressable
        onPress={() => router.push("../screens/forgot-password")}
        className="mb-4 items-center"
      >
        <Text className="text-violet-600 text-sm">Forgot password?</Text>
      </Pressable>
    </View>
  );
}
