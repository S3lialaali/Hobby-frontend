//reads user id from the token and fetches the establishment's activities
import React, { useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchActivities } from "@/api/activities";

export default function EstablishmentActivities() {
  const { id: userId } = useCurrentUser();

  const [ estId, setEstId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      //1- fetch establishments
      const establishment = await fetchEstablishments({ owner_user_id: userId});

      //2-resolve the establishment id, if none show null
      const est = establishment?.[0];
      const theId = est?.id ?? null;
      setEstId(theId);

      //3-id id available, fetch activities
      if (theId) {
        const activities = await fetchActivities({ establishment_id: theId, order: "newest"});
        setActivities(Array.isArray(activities) ? activities : []);
      } else {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    //load user
    load();
  }, [userId]);

  // Handler to delete an activity row (by id).
  // async function onDelete(id: number) {
  //   try {
  //     await deleteActivity(id); // Backend enforces ownership/authorization.
  //     Alert.alert("Deleted", "Activity removed.");
  //     // Optimistic local update: remove the item from the list without a full reload.
  //     setActivities((prev) => prev.filter((x) => x.id !== id));
  //   } catch (e) {
  //     Alert.alert("Error", "Failed to delete activity.");
  //   }
  // }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
          <Text className="text-xl font-bold mb-3">Your Activities</Text>
        </View>
  );
}