import { Tabs, router, useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, Pressable, Text, StyleSheet, Platform } from "react-native";
import { useCurrentUser } from "../../sessions/useCurrentUser.js";

export default function EstablishmentLayout() {
    //read the role of the user from the jwt
    const { role } = useCurrentUser();
    const router = useRouter();

    //if role is not business, redirect to normal usr interface
    useEffect(() => {
        if (role !== null && role !== "business") {
            router.replace("/(tabs)");
        }
    }, [role, router]);

    if (role == null) {
        return (
            <View style={{ flex:1, alignItems: "center", justifyContent: "center"}}>
                <ActivityIndicator />
            </View>
        );
    }

    if (role !== "business") {
        return null;
    }

    //business user interface has three tabs: dashboard, activities, and instructros
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: true,
                    // place the back button inside the header for all tabs
                    headerLeft: () => (
                        <Pressable
                            onPress={() => router.replace("/screens/login")}
                            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingLeft: 12 }]}
                        >
                            <Text style={styles.backText}>‹ Back</Text>
                        </Pressable>
                    ),
                }}
            >
            {/*Default tab -> Dashbaord*/}
            <Tabs.Screen name = "index" options={{title: "Dashboard"}} />
            {/*Activity management screen*/}
            <Tabs.Screen name = "activities" options={{title: "Activities"}} />
            {/*Instructor management screen*/}
            <Tabs.Screen name = "instructors" options={{title: "Instructors"}} />
        </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    backContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 50 : 18,
        left: 12,
        zIndex: 20,
    },
    backText: {
        fontSize: 16,
        color: "#007AFF",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
});