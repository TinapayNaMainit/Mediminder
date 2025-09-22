import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  cancelAllReminders,
  scheduleExpiryAlert,
  scheduleMedicationReminder,
  scheduleMissedDoseAlert,
} from "../../lib/notifications";
import { supabase } from "../../lib/supabaseClient";

export default function AddMedication() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const editingMedication = params.medication
    ? JSON.parse(params.medication as string)
    : null;

  const [medicationName, setMedicationName] = useState(editingMedication?.medication_name || "");
  const [dosage, setDosage] = useState(editingMedication?.dosage || "");
  const [dosageUnit, setDosageUnit] = useState(editingMedication?.dosage_unit || "");
  const [frequency, setFrequency] = useState(editingMedication?.frequency || "Once a day");
  const [reminderTime, setReminderTime] = useState(editingMedication?.reminder_time || "");
  const [expiryDate, setExpiryDate] = useState(editingMedication?.expiry_date || "");
  const [notes, setNotes] = useState(editingMedication?.notes || "");
  const [medicineImage, setMedicineImage] = useState(editingMedication?.image || null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) setMedicineImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) setMedicineImage(result.assets[0].uri);
  };

  const removeImage = () => setMedicineImage(null);

  const handleSave = async () => {
    if (!medicationName) {
      Alert.alert("Error", "Medication name is required");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "You must be logged in to add medications");
      return;
    }

    const medicationData = {
      user_id: user.id,
      medication_name: medicationName,
      dosage,
      dosage_unit: dosageUnit,
      frequency,
      reminder_time: reminderTime,
      expiry_date: expiryDate,
      notes,
      image: medicineImage,
    };

    let medId = editingMedication?.id;
    let error;
    if (editingMedication) {
      const { error: updateError } = await supabase
        .from("medications")
        .update(medicationData)
        .eq("id", editingMedication.id);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("medications")
        .insert([medicationData])
        .select("id")
        .single();
      error = insertError;
      medId = data?.id;
    }

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await cancelAllReminders(); // clear old reminders

      // ✅ Schedule new reminders
      if (reminderTime) {
        await scheduleMedicationReminder(
          medId,
          new Date(reminderTime),
          "💊 Medication Reminder",
          `Time to take your ${medicationName}`
        );

        await scheduleMissedDoseAlert(
          medId,
          new Date(reminderTime),
          "⏰ Missed Dose",
          `You missed your scheduled dose of ${medicationName}`
        );
      }

      if (expiryDate) {
        await scheduleExpiryAlert(
          medId,
          new Date(expiryDate),
          "⚠️ Expiry Alert",
          `${medicationName} has expired!`
        );
      }

      Alert.alert("Success", "Medication saved successfully!");
      router.back();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>
        {editingMedication ? "Edit Medication" : "Add New Medication"}
      </Text>

      {/* Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Medication Name</Text>
        <View style={[styles.textInput, styles.fixedHeight]}>
          <RNTextInput
            value={medicationName}
            onChangeText={setMedicationName}
            style={styles.inputField}
            placeholder="Enter medication name"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Image */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Medicine Image (optional)</Text>
        {medicineImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: medicineImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
              <Text style={styles.removeImageText}>×</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={[styles.imageButton, styles.fixedHeight]} onPress={pickImage}>
              <Text style={styles.imageButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <Text style={styles.imageButtonOr}>or</Text>
            <TouchableOpacity style={[styles.imageButton, styles.fixedHeight]} onPress={takePhoto}>
              <Text style={styles.imageButtonText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dosage + Unit */}
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Dosage</Text>
          <View style={[styles.textInput, styles.fixedHeight]}>
            <RNTextInput
              value={dosage}
              onChangeText={setDosage}
              keyboardType="numeric"
              style={styles.inputField}
              placeholder="e.g. 500"
              placeholderTextColor="#999"
            />
          </View>
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Unit</Text>
          <View style={[styles.textInput, styles.fixedHeight]}>
            <RNTextInput
              value={dosageUnit}
              onChangeText={setDosageUnit}
              style={styles.inputField}
              placeholder="mg/ml"
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </View>

      {/* Frequency */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Frequency</Text>
        <View style={[styles.textInput, styles.fixedHeight]}>
          <RNTextInput
            value={frequency}
            onChangeText={setFrequency}
            style={styles.inputField}
            placeholder="Once a day"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Reminder Time */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Reminder Time</Text>
        <View style={[styles.textInput, styles.fixedHeight]}>
          <RNTextInput
            value={reminderTime}
            onChangeText={setReminderTime}
            style={styles.inputField}
            placeholder="YYYY-MM-DD HH:mm:ss"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Expiry Date */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Expiry Date</Text>
        <View style={[styles.textInput, styles.fixedHeight]}>
          <RNTextInput
            value={expiryDate}
            onChangeText={setExpiryDate}
            style={styles.inputField}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Notes */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Notes</Text>
        <View style={[styles.textInput, styles.fixedHeight]}>
          <RNTextInput
            value={notes}
            onChangeText={setNotes}
            style={styles.inputField}
            placeholder="Any extra notes"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {editingMedication ? "Update Medication" : "Add Medication"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  fixedHeight: { minHeight: 45, justifyContent: "center", paddingHorizontal: 10 },
  inputField: { fontSize: 16, color: "#333" },
  row: { flexDirection: "row" },
  imageButtonsContainer: { alignItems: "center" },
  imageButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  imageButtonText: { color: "#fff", fontWeight: "bold" },
  imageButtonOr: { marginVertical: 4, fontSize: 14 },
  imagePreviewContainer: { position: "relative", alignItems: "center" },
  imagePreview: { width: 100, height: 100, borderRadius: 8, marginTop: 8 },
  removeImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "red",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
