//reads user id from the token and fetches the establishment's activities
import React, { useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert, ScrollView, TextInput } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { createActivity, fetchActivities, updateActivity, deleteActivity } from "@/api/activities";

type Establishment ={
  id: number;
  name: string;
  status: string;
};

type Activity ={
  id: number;
  establishment_id: number;
  title?: string;
  name?: string;
  description?: string | null;
  price?: number | null;
};

export default function EstablishmentActivities() {
  //read user id and role from access token
  const { id: userId } = useCurrentUser();

  //UI state
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  //add activity form states
  const [creating, setCreating] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPrice, setAddPrice] = useState("");

  //edit activity form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  //helper to load establishemtn and activites for this user
  async function load() {
    if(!userId) return;

    setLoading(true);
    setError(null);

    try {
      //1- fetch establishments
      const establishment = await fetchEstablishments({ owner_user_id: userId});
      //2-resolve the establishment id
      const est = establishment?.[0];
      
      if (!est?.id) {
        setEstablishment(null);
        setActivities([]);
        setError("No establishment yet");
        return;
      }

      //snapsht for header
      setEstablishment({
        id: est.id,
        name: est.name,
        status: est.status
      });

      //3-id id available, fetch activities
      const activities = await fetchActivities({ 
        establishment_id: est.id,
        order: "newest"});
      setActivities(Array.isArray(activities) ? activities : []);
    } catch (err) {
      console.error("Error loading establishment activities, err");
      setError("Could not load activities. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    //load user
    load();
  }, [userId]);

  //Handle to create new activities
  async function handleAdd() {
    if (!establishment?.id) return;

    const title = addTitle.trim();
    if (!title) {
      Alert.alert("Missing title", "Please enter a title for the activity.");
      return;
    }

    //adding price (optional)
    let price: number | null = null;
    if (addPrice.trim()) {
      const n = Number(addPrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert("Invalid price", "Price must be a positive number.");
        return;
      }
      price = n;
    }

    try {
      setCreating(true);

      //payload should match backend
      const payload = {
        establishment_id: establishment.id,
        title, 
        description: addDescription.trim() || null,
        price,
      };

      //call api/activities.js
      await createActivity(payload);

      await load();

      //reset form
      setAddTitle("");
      setAddDescription("");
      setAddPrice("");
    } catch (err) {
      console.error("Error creating activity", err);
      Alert.alert("Error","Could not create activity. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  //editing activity
  function startEdit(act: Activity) {
    setEditingId(act.id);
    setEditTitle(act.title ?? act.name ?? "")
    setEditDescription(act.description ?? "");
    setEditPrice(
      typeof act.price === "number" && !Number.isNaN(act.price)
      ? String(act.price) : ""
    );
  }

  //Save edit changes to activities
  async function handleSaveEdit() {
    if (!establishment?.id || editingId == null) return;

    const title = editTitle.trim();
    if (!title) {
      Alert.alert("Missing title", "Please enter a title for the activity.")
      return;
    }

    let price: number | null = null;
    if (editPrice.trim()) {
      const n = Number(editPrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert("Invalid price", "Price must be a positive number.");
        return;
      }
      price = n;
    }

    try {
      //patch object with only fields that we allow to be edited
      const patch = {
        title,
        description: editDescription.trim() || null,
        price,
      };

      //call api/activities.js
      await updateActivity(editingId, patch);

      //update local state without reloading app
      setActivities((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...patch } : a))
      );

      //reset edit state
      setEditingId(null);
      setEditTitle("");
      setEditDescription("");
      setEditPrice("");
    } catch (err) {
      console.error("Error updating activity", err);
      Alert.alert("Error", "Could not update activity. Please try again.");
    }
  }

  //delete activity
  async function handleDelete(id: number) {
    Alert.alert(
      "DElete activity", "Are you sure you want to delete this activity?",
      [
        { text: "Cancel", style: "cancel"},
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              //call delete function from api/activities
              await deleteActivity(id);

              //remove from activities list without reloading app
              setActivities((prev) => prev.filter((a) => a.id !== id));

              //if in middle of editing activity, then close the editing form
              if (editingId === id) {
                setEditingId(null);
                setEditTitle("");
                setEditDescription("");
                setEditPrice("");
              }
            } catch (err) {
              console.error("Error deleting activity", err);
              Alert.alert("Error", "Could not delete activity. Please try again.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

   // Safety guard – should not normally happen if establishment exists
  if (!establishment) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center">
          You don't have an establishment yet. Create one first.
        </Text>
      </View>
    );
  }

   return (
    <ScrollView className="flex-1 p-4">
      {/* Header showing which establishment this dashboard is for */}
      <Text className="text-xl font-bold mb-2">Activities</Text>
      <Text className="text-sm text-gray-500 mb-4">
        Establishment:{" "}
        <Text className="font-semibold">{establishment.name}</Text>{" "}
        ({establishment.status})
      </Text>

      {/* Create new activity form */}
      <View className="mb-6 p-3 rounded-2xl border border-gray-200">
        <Text className="font-semibold mb-2">Add new activity</Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Title *"
          value={addTitle}
          onChangeText={setAddTitle}
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Description"
          value={addDescription}
          onChangeText={setAddDescription}
          multiline
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Price (optional, BHD)"
          keyboardType="numeric"
          value={addPrice}
          onChangeText={setAddPrice}
        />

        <TouchableOpacity
          onPress={handleAdd}
          disabled={creating}
          className="mt-1 rounded-2xl bg-blue-600 px-4 py-2 items-center justify-center"
        >
          {creating ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Create activity</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit existing activity form (only visible when editingId is set) */}
      {editingId != null && (
        <View className="mb-6 p-3 rounded-2xl border border-amber-400 bg-amber-50">
          <Text className="font-semibold mb-2">Edit activity</Text>

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Title *"
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Description"
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Price (optional, BHD)"
            keyboardType="numeric"
            value={editPrice}
            onChangeText={setEditPrice}
          />

          <View className="flex-row gap-4 mt-1">
            <TouchableOpacity
              onPress={handleSaveEdit}
              className="flex-1 rounded-2xl bg-blue-600 px-4 py-2 items-center justify-center"
            >
              <Text className="text-white font-semibold">Save changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEditingId(null);
                setEditTitle("");
                setEditDescription("");
                setEditPrice("");
              }}
              className="flex-1 rounded-2xl border border-gray-400 px-4 py-2 items-center justify-center"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List of existing activities for this establishment */}
      <FlatList
        data={activities}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false} // we scroll the outer ScrollView instead
        ListEmptyComponent={
          <Text className="text-gray-500">
            You have no activities yet. Add one above to get started.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 p-3 rounded-2xl border border-gray-200">
            <Text className="font-semibold">
              {item.title ?? item.name ?? "Untitled activity"}
            </Text>

            {item.description ? (
              <Text className="text-gray-500 mt-1">{item.description}</Text>
            ) : null}

            {/* Price: handle both string (from MySQL) and number (from local state) */}
            {item.price !== null &&
              item.price !== undefined &&
              String(item.price) !== "" && (
                <Text className="text-gray-500 mt-1">
                  Price: {item.price} BHD
                </Text>
              )}

            <View className="flex-row gap-4 mt-2">
              <TouchableOpacity onPress={() => startEdit(item)}>
                <Text className="text-blue-600 font-semibold">Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text className="text-red-600 font-semibold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}