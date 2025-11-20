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
                    const instructors = await fetchInstructors({ establishmentId: est});
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
        </View>
    )
}
