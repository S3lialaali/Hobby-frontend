//reads user id from token and fetches instructors of the establishments
import React, { use, useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert, ScrollView, TextInput } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchInstructors, deleteInstructor, createInstructor, updateInstructor } from "@/api/instructors";

//estabishment shape for header
type Establishment = {
  id: number;
  name: string;
  status: string
};

//instructor shape for header
type Instructor = {
  id: number;
  establishment_id: number;
  name: string;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function EstablishmentInstructors() {
  const { id: userId } = useCurrentUser();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [error, setError] = useState<string | null>(null);

  //add instructor form state
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBio, setAddBio] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");

  //edit instructor for state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  //load establishment and its instructors
  async function load() {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      //1-fetch the establishment
      const establishment = await fetchEstablishments({ owner_user_id: userId});
      const est = establishment?.[0];
      
      if (!est?.id) {
        setEstablishment(null);
        setInstructors([]);
        setError("You don't have an establishment.");
        return;
      }

      setEstablishment({
        id: est.id,
        name: est.name,
        status: est.status
      });

      //2- if id available, fetch instructors
        const list = await fetchInstructors({ establishment_id: est.id});
        setInstructors(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading establishment instructors", err);
      setError("Could not load instructors. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    //load data
    load();
  }, [userId]);

  //handle to create new instructor
  async function handleAdd() {
    if (!establishment?.id) return;

    const name = addName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter the instructor's name.");
      return;
    }

    try {
      setAdding(true);

      const payload = {
        establishment_id: establishment.id,
        name: name.trim(),
        bio: addBio.trim() || null,
        phone: addPhone.trim() || null,
        email: addEmail.trim() || null
      };

      // call funciton from /api/instructors
      await createInstructor(payload);

      //reload list to sync data
      await load();

      //reset the form 
      setAddName("");
      setAddBio("");
      setAddPhone("");
      setAddEmail("");
    } catch (err) {
      console.error("Error creating instructor", err);
      Alert.alert("Error", "Could not create instructor. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  //editing instructor function
  function startEdit(inst: Instructor) {
    setEditingId(inst.id);
    setEditName(inst.name ?? "");
    setEditBio(inst.bio ?? "");
    setEditPhone(inst.phone ?? "");
    setEditEmail(inst.email ?? "");
  }

  //save edit chnages to in instructors
  async function handleSaveEdit() {
    if (!establishment?.id || editingId == null) return;

    const name = editName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter the instructor's name.");
      return;
    }

    try {
      const patch = {
        name, 
        bio: editBio.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null
      };

      //call update instructors function from api/instructors
      await updateInstructor(editingId, patch);

      //update the local list to show data without reloading app
      setInstructors((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, ...patch } : i))
      );

      //reset teh edit state
      setEditingId(null);
      setEditName("");
      setEditBio("");
      setEditPhone("");
      setEditEmail("");
    } catch (err) {
      console.error("Error updating instructor", err);
      Alert.alert("Error", "Could not update instructor. Please try agaon.");
    }
  }

  //handler to delete instructor
  async function handleDelete(id: number) {
    Alert.alert(
      "Delete instructor",
    "Are you sure you want to delete this instructor?",
  [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          //call delete instructor function from api/instructors
          await deleteInstructor(id);

          //remove instructor from local state without reloading app
          setInstructors((prev) => prev.filter((i) => i.id !== id));

          if (editingId === id) {
            setEditingId(null);
            setEditName("");
            setEditBio("");
            setEditPhone("");
            setEditEmail("");
          }
        } catch (err) {
          console.error("Error deleteing instructor", err);
          Alert.alert("Error", "Could not delete instructor. Please try again.");
        }
      },
    },
  ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  // No establishment guard
  if (!establishment) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center">
          You don't have an establishment yet. Create one first.
        </Text>
      </View>
    );
  }

  // Normal UI
  return (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold mb-2">Instructors</Text>
      <Text className="text-sm text-gray-500 mb-4">
        Establishment:{" "}
        <Text className="font-semibold">{establishment.name}</Text>{" "}
        ({establishment.status})
      </Text>

      {/* Create new instructor form */}
      <View className="mb-6 p-3 rounded-2xl border border-gray-200">
        <Text className="font-semibold mb-2">Add new instructor</Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Name *"
          value={addName}
          onChangeText={setAddName}
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Bio"
          value={addBio}
          onChangeText={setAddBio}
          multiline
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Phone"
          value={addPhone}
          onChangeText={setAddPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
          placeholder="Email"
          value={addEmail}
          onChangeText={setAddEmail}
          keyboardType="email-address"
        />

        <TouchableOpacity
          onPress={handleAdd}
          disabled={adding}
          className="mt-1 rounded-2xl bg-blue-600 px-4 py-2 items-center justify-center"
        >
          {adding ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Create instructor</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit instructor form (visible when editingId is set) */}
      {editingId != null && (
        <View className="mb-6 p-3 rounded-2xl border border-amber-400 bg-amber-50">
          <Text className="font-semibold mb-2">Edit instructor</Text>

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Name *"
            value={editName}
            onChangeText={setEditName}
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Bio"
            value={editBio}
            onChangeText={setEditBio}
            multiline
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Phone"
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-3 py-2 mb-2"
            placeholder="Email"
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
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
                setEditName("");
                setEditBio("");
                setEditPhone("");
                setEditEmail("");
              }}
              className="flex-1 rounded-2xl border border-gray-400 px-4 py-2 items-center justify-center"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List of instructors */}
      <FlatList
        data={instructors}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text className="text-gray-500">
            You have no instructors yet. Add one above to get started.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 p-3 rounded-2xl border border-gray-200">
            <Text className="font-semibold">{item.name}</Text>

            {item.bio ? (
              <Text className="text-gray-500 mt-1">{item.bio}</Text>
            ) : null}

            {(item.phone || item.email) && (
              <Text className="text-gray-500 mt-1">
                {item.phone ? item.phone : ""}
                {item.phone && item.email ? " · " : ""}
                {item.email ? item.email : ""}
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