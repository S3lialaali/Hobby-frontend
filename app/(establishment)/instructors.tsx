//reads user id from token and fetches instructors of the establishments
import React, { useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchInstructors, deleteInstructor } from "@/api/instructors";

export default function EstablishmentInstructors() {
  const { id: userId } = useCurrentUser();

  const [estId, setEstId] = useState<number | null>(null);
  const [loading,setLoading] = useState(true);
  const [instructors, setInstructors] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      //1-fetch the establishment
      const establishment = await fetchEstablishments({ owner_user_id: userId});
      const est = establishment?.[0];
      const theId = est?.id ?? null;
      setEstId(theId);

      //2- if id available, fetch instructors
      if (theId) {
        const list = await fetchInstructors({ establishmentId: theId});
        setInstructors(Array.isArray(list) ? list : []);
      } else {
        setInstructors([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    //load data
    load();
  }, [userId]);

  // Handler to delete an instructor row (by id).
  // async function onDelete(id: number) {
  //   try {
  //     await deleteInstructor(id); // Backend should verify ownership and permissions.
  //     Alert.alert("Deleted", "Instructor removed.");
  //     // Optimistic local update avoids a full reload.
  //     setInstructors((prev) => prev.filter((x) => x.id !== id));
  //   } catch (e) {
  //     Alert.alert("Error", "Failed to delete instructor.");
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
      <Text className="text-xl font-bold mb-3">Your Instructors</Text>
    </View>
  );
}