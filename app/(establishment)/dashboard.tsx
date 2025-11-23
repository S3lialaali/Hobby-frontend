//dashboard page that loads establishment owned by the current user and shows its data
import React, {useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api";
import { fetchActivities } from "@/api";
import { fetchInstructors } from "@/api";

export default function EstablishmentDashboard() {
    //id of current user from jwt
    const { id:userId} = useCurrentUser();

    //local state, loading and data
    const [loading, setLoading] = useState(true); //show loading
    const [establishments, setEstablishments] = useState<any[]>([]); //all establishments owned by user
    const [activityCount, setActivityCount] = useState(0);
    const [instructorCount, setInstructorCount] = useState(0);

    useEffect(() => {
        //load data
        (async () => {
            setLoading(true);
            try {
                //1- fetch establishments owned by the user id
                const establishment = await fetchEstablishments({ owner_user_id: userId});
                setEstablishments(establishment || []);

                //2-fetch the establishment id (only one per user at the moment)
                const est = establishment?.[0];
                if (est?.id) {
                    //count activities and instructors 
                    const activities = await fetchActivities({ establishment_id: est.id });
                    const instructors = await fetchInstructors({ establishment_id: est.id});
                    setActivityCount(Array.isArray(activities) ? activities.length : 0);
                    setInstructorCount(Array.isArray(instructors) ? instructors.length : 0);
                } else {
                    setActivityCount(0);
                    setInstructorCount(0);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
                <Text className="mt-2">Loading...</Text>
            </View>
        );
    }

    const est = establishments[0];  //the establishment to display

    return (
        <View className="flex-1 p-4">
            <Text className="text-xl font-bold mb-2">Dashboard</Text>

            {est ? (
                <>
                    {/* Summary of establishment info */}
                    <Text className="mb-1">Establishment: {est.name}</Text>
                    <Text className="mb-1">Status: {est.status}</Text>
                    <Text className="mb-1">Activities: {activityCount}</Text>
                    <Text className="mb-4">Instructors: {instructorCount}</Text>

                    {/* details */}
                    <Text className="text-base font-semibold mb-2">Your establishment</Text>
            <FlatList
                data={establishments}
                keyExtractor={(x) => String(x.id)}
                ListEmptyComponent={<Text>No establishment found.</Text>}
                renderItem={({ item }) => (
                <View className="mb-3 p-3 rounded-2xl border border-gray-200">
                    <Text className="font-semibold">{item.name}</Text>
                    <Text className="text-gray-500">{item.address}</Text>
                    <Text className="text-gray-500">Status: {item.status}</Text>
                    <Text className="text-gray-500">Clicks: {item.clicks}</Text>
                </View>
                )}
                />
                </>
            ) : (
                <Text>No establishment available</Text>
            )

            }
        </View>
    );
}
