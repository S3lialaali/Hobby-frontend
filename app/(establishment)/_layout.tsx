import { Tabs, router, useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, Pressable, Text, StyleSheet, Platform } from "react-native";
import { useCurrentUser } from "../../sessions/useCurrentUser.js";
import { FontAwesome } from "@expo/vector-icons";

const colors = {
  primary_orange: '#FFC067',
  secondary_purple: '#7C3AED',
  accent_teal: '#67F2FF',
};

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
        <View style={{ flex: 1, paddingTop: 50 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.secondary_purple,
                    tabBarShowLabel: false,
                    tabBarItemStyle: { paddingTop: 8 },
                }}
            >
            <Tabs.Screen 
                name = "dashboard" 
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, focused, size }) => (
                        <FontAwesome name="home" size={32} color={focused ? colors.secondary_purple : color} />
                    ),
                }} 
            />
            
            <Tabs.Screen 
                name = "activities"
                options={{
                    title: "Activities",
                    tabBarIcon: ({ color, focused, size }) => (
                        <FontAwesome name="table" size={32} color={focused ? colors.secondary_purple : color} />
                    ),
                }}
            />

            <Tabs.Screen 
                name = "instructors" 
                options={{
                    title: "Instructors",
                    tabBarIcon: ({ color, focused, size }) => (
                        <FontAwesome name="users" size={32} color={focused ? colors.secondary_purple : color} />
                    ),
                }} 
            />
        
            <Tabs.Screen 
                name = "bookings" 
                options={{
                    title: "Bookings",
                    tabBarIcon: ({ color, focused, size }) => (
                        <FontAwesome name="book" size={32} color={focused ? colors.secondary_purple : color} />
                    )
                }}
            />

            <Tabs.Screen 
                name = "account" 
                options={{
                    title: "Account",
                    tabBarIcon: ({ color, focused, size }) => (
                        <FontAwesome name="user" size={32} color={focused ? colors.secondary_purple : color} />
                    )
                }}
            />
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