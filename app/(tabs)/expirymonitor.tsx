import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";

type Medication = {
  id: string;
  medication_name: string;
  dosage?: string;
  end_date?: string;
  image?: string;
  notes?: string;
  frequency?: string;
  dosage_unit?: string;
  custom_interval?: string;
  custom_interval_unit?: string;
  start_date?: string;
  reminder_time?: string;
};

export default function ExpiryMonitor() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "soon" | "expired">("all");
  const router = useRouter();

  // Fetch meds
  const fetchMedications = useCallback(async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching medications:", error.message);
    } else {
      setMedications(data || []);
    }
    setLoading(false);
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchMedications();

    const channel = supabase
      .channel("expiry-monitor")
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

  // Filter logic
  const today = new Date();
  const filteredMeds = medications.filter((med) => {
    if (!med.end_date) return filter === "all";

    const endDate = new Date(med.end_date);
    const diffDays = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (filter === "all") return true;
    if (filter === "soon") return diffDays > 0 && diffDays <= 7;
    if (filter === "expired") return diffDays <= 0;
    return true;
  });

  // Expiry status helper
  const getExpiryStatus = (endDate?: string) => {
    if (!endDate) return { text: "No end date", color: "#999" };
    const d = new Date(endDate);
    const diff = Math.ceil(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff <= 0) return { text: "Expired", color: "red" };
    if (diff <= 7) return { text: `Expiring in ${diff} day(s)`, color: "orange" };
    return { text: `Valid (${diff} days left)`, color: "green" };
  };

  // Edit handler → Navigate to Add Medication in edit mode
  const handleEdit = (medication: Medication) => {
    router.push({
      pathname: "/add-medication",
      params: { medication: JSON.stringify(medication) },
    });
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this medication?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("medications")
              .delete()
              .eq("id", id);

            if (error) {
              Alert.alert("Error", "Failed to delete medication.");
            } else {
              Alert.alert("Deleted", "Medication removed successfully.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expiry Monitor</Text>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {["all", "soon", "expired"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all"
                ? "ALL"
                : f === "soon"
                ? "EXPIRING SOON"
                : "EXPIRED"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : filteredMeds.length === 0 ? (
        <Text style={styles.noData}>No medications found.</Text>
      ) : (
        <FlatList
          data={filteredMeds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const { text, color } = getExpiryStatus(item.end_date);
            return (
              <View style={styles.card}>
                <Text style={styles.medName}>{item.medication_name}</Text>
                <Text style={styles.dosage}>{item.dosage || ""}</Text>
                <Text style={[styles.status, { color }]}>{text}</Text>

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
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 50 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginHorizontal: 5,
  },
  filterButtonActive: { backgroundColor: "#6C63FF" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#333" },
  filterTextActive: { color: "#fff" },
  noData: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  medName: { fontSize: 18, fontWeight: "bold", color: "#222" },
  dosage: { fontSize: 14, color: "#666", marginTop: 4 },
  status: { fontSize: 14, fontWeight: "600", marginTop: 6 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  actionText: { color: "#fff", fontWeight: "600" },
});
