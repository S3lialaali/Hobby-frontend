//reads user id from token and fetches instructors of the establishments
import React, { use, useEffect, useState} from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert, ScrollView, TextInput, Image } from "react-native";
import { useCurrentUser } from "@/sessions/useCurrentUser";
import { fetchEstablishments } from "@/api/establishments";
import { fetchInstructors, deleteInstructor, createInstructor, updateInstructor } from "@/api/instructors";
import * as ImagePicker from "expo-image-picker";
import { uploadInstructorImage } from "@/api/uploads";
import { API_BASE_URL } from "@/api/client";

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
  profile_picture?: string | null;
};

function getImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}/images/${path}`;
}


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
  const [addImage, setAddImage] = useState<{ uri: string } | null>(null);
  const [changingInstructorImageId, setChangingInstructorImageId] = useState<number | null>(null); 

  //edit instructor for state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  async function handlePickAddImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need access to your photos to select an instructor image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (asset?.uri) {
        setAddImage({ uri: asset.uri });
      }
    } catch (err) {
      console.warn("Image pick error", err);
      Alert.alert("Image error", "Could not open the image library. Please try again.");
    }
  }

  async function handleChangeInstructorImage(instructorId: number) {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need access to your photos to change the instructor image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (!asset?.uri) return;

      setChangingInstructorImageId(instructorId);

      try {
        await uploadInstructorImage(instructorId, asset.uri);
        await load();
      } catch (err) {
        console.error("Error changing instructor image", err);
        Alert.alert(
          "Image upload failed",
          "The instructor was updated, but we could not change their image."
        );
      } finally {
        setChangingInstructorImageId(null);
      }
    } catch (err) {
      console.warn("Image picker error", err);
      Alert.alert("Error", "Could not open the image library. Please try again.");
    }
  }


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
      const created = await createInstructor(payload);

      //optional image upload
      if (created?.id && addImage?.uri) {
        try {
          await uploadInstructorImage(created.id, addImage.uri);
        } catch (err) {
          console.error("Error uploading instructor image", err);
          Alert.alert("Image upload error", "Instructor created but image upload failed.");
        }
      } 

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

      {/* Instructor image (optional) */}
      <Text className="font-semibold mt-1 mb-2">Instructor image (optional)</Text>
      <View className="flex-row items-center mb-2">
          <TouchableOpacity
            onPress={handlePickAddImage}
            className="px-4 py-2 rounded-2xl bg-purple-600"
          >
            <Text className="text-white text-sm font-semibold">Choose image</Text>
          </TouchableOpacity>

          {addImage ? (
            <Image
              source={{ uri: addImage.uri }}
              className="w-12 h-12 rounded-full ml-3"
            />
          ) : (
            <Text className="ml-3 text-xs text-gray-500">No image selected</Text>
          )}
        </View>

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
          className="mt-1 rounded-2xl bg-purple-600 px-4 py-2 items-center justify-center"
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
        <View className="mb-6 p-3 rounded-2xl border border-purple-400 bg-purple-50">
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
              className="flex-1 rounded-2xl bg-purple-600 px-4 py-2 items-center justify-center"
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
          renderItem={({ item }) => {
            const avatarUri = getImageUrl(item.profile_picture);

            return (
              <View className="mb-3 p-3 rounded-2xl border border-gray-200 bg-white">
                <View className="flex-row items-center">
                  <Image
                    source={
                      avatarUri
                        ? { uri: avatarUri }
                        : require("../../assets/images/instructors/profile_placeholder.jpeg") // optional if you have one
                    }
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">{item.name}</Text>

                    {item.bio ? (
                      <Text className="text-[12px] text-gray-500 mt-[2px]">
                        {item.bio}
                      </Text>
                    ) : null}

                    {(item.phone || item.email) && (
                      <Text className="text-[12px] text-gray-500 mt-[2px]">
                        {item.phone ? item.phone : ""}
                        {item.phone && item.email ? " · " : ""}
                        {item.email ? item.email : ""}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="flex-row flex-wrap items-center gap-4 mt-2">
                  <TouchableOpacity onPress={() => handleChangeInstructorImage(item.id)}>
                    <Text className="text-[12px] font-semibold text-purple-600">
                      {changingInstructorImageId === item.id ? "Changing image..." : "Change image"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => startEdit(item)}>
                    <Text className="text-[12px] font-semibold text-purple-600">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text className="text-[12px] font-semibold text-red-600">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
    </ScrollView>
  );
}