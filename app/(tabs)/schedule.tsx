import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";

type Medication = {
  id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  reminder_time?: string;
};

export default function Schedule() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch meds
  const fetchMedications = useCallback(async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", user.id)
      .order("reminder_time", { ascending: true });

    if (error) {
      console.error("Error fetching medications:", error.message);
    } else {
      setMedications(data || []);
    }
    setLoading(false);
  }, []);

  // Subscribe realtime
  useEffect(() => {
    fetchMedications();
    const channel = supabase
      .channel("schedule-meds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medications" },
        () => fetchMedications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMedications]);

  // Logging
  const logMedicationStatus = async (
    medicationId: string,
    status: "taken" | "missed" | "skipped"
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase.from("medication_logs").upsert(
      { medication_id: medicationId, user_id: user.id, log_date: today, status },
      { onConflict: "medication_id, log_date" }
    );

    if (error) {
      console.error("Error logging:", error.message);
      Platform.OS === "android"
        ? ToastAndroid.show("❌ Failed to log", ToastAndroid.SHORT)
        : Alert.alert("Error", "Failed to log");
    } else {
      const msg =
        status === "taken"
          ? "✅ Taken"
          : status === "missed"
          ? "❌ Missed"
          : "⏭ Skipped";
      Platform.OS === "android"
        ? ToastAndroid.show(msg, ToastAndroid.SHORT)
        : Alert.alert("Success", msg);
    }
  };

  // Edit handler
  const handleEdit = (medication: Medication) => {
    router.push({
      pathname: "/add-medication",
      params: { medication: JSON.stringify(medication) },
    });
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Delete this medication?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("medications").delete().eq("id", id);
          if (error) Alert.alert("Error", "Failed to delete");
          else Alert.alert("Deleted", "Medication removed");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : medications.length === 0 ? (
        <Text style={styles.noData}>No scheduled medications.</Text>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.medName}>{item.medication_name}</Text>
              <Text style={styles.details}>{item.dosage || ""}</Text>
              <Text style={styles.details}>{item.frequency || ""}</Text>
              <Text style={styles.details}>
                {item.reminder_time
                  ? new Date(item.reminder_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>

              {/* Log Buttons */}
              <View style={styles.logRow}>
                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "green" }]}
                  onPress={() => logMedicationStatus(item.id, "taken")}
                >
                  <Text style={styles.logButtonText}>Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "red" }]}
                  onPress={() => logMedicationStatus(item.id, "missed")}
                >
                  <Text style={styles.logButtonText}>Missed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "orange" }]}
                  onPress={() => logMedicationStatus(item.id, "skipped")}
                >
                  <Text style={styles.logButtonText}>Skipped</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#F44336" }]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 50 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 15, textAlign: "center" },
  noData: { textAlign: "center", color: "#666", marginTop: 20, fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  medName: { fontSize: 18, fontWeight: "bold", color: "#222" },
  details: { fontSize: 14, color: "#666", marginTop: 2 },
  logRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  logButton: { flex: 1, paddingVertical: 8, borderRadius: 8, marginHorizontal: 4, alignItems: "center" },
  logButtonText: { color: "#fff", fontWeight: "600" },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  actionButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, marginLeft: 10 },
  actionText: { color: "#fff", fontWeight: "600" },
});
