// app/index.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-extrabold text-gray-900 mb-8">Hobby App</Text>
        <Text className="text-gray-500 mb-10 text-center">Choose interface</Text>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          className="w-full bg-indigo-500 py-3 rounded-2xl items-center mb-4"
        >
          <Text className="text-white text-base font-semibold">Go to User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(admin)/dashboard")}
          className="w-full bg-gray-100 py-3 rounded-2xl items-center"
        >
          <Text className="text-gray-900 text-base font-semibold">Go to Admin</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
