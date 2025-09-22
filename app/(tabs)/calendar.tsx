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
import { Calendar } from "react-native-calendars";
import { supabase } from "../../lib/supabaseClient";

type MedicationLog = {
  id: string;
  medication_id: string;
  user_id: string;
  log_date: string;
  status: "taken" | "missed" | "skipped";
  medications?: { medication_name: string; dosage?: string };
};

export default function MedicationCalendar() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [dayLogs, setDayLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "taken" | "missed" | "skipped">(
    "all"
  );

  // Fetch logs for current month
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const { data, error } = await supabase
      .from("medication_logs")
      .select("*, medications(medication_name, dosage)")
      .gte("log_date", startOfMonth.toISOString().split("T")[0])
      .lte("log_date", endOfMonth.toISOString().split("T")[0]);

    if (error) {
      console.error("Error fetching logs:", error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("calendar-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medication_logs" },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Update dayLogs when selectedDate changes
  useEffect(() => {
    const medsForDay = logs.filter((log) => log.log_date === selectedDate);
    setDayLogs(medsForDay);
  }, [selectedDate, logs]);

  // Build marked dates for calendar
  const markedDates = logs.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = { dots: [], marked: true };
    if (log.status === "taken") {
      acc[date].dots.push({ key: "taken", color: "green" });
    } else if (log.status === "missed") {
      acc[date].dots.push({ key: "missed", color: "red" });
    } else if (log.status === "skipped") {
      acc[date].dots.push({ key: "skipped", color: "orange" });
    }
    return acc;
  }, {} as Record<string, any>);

  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] || {}),
    selected: true,
    selectedColor: "#6C63FF",
  };

  // Logging function
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
      console.error("Error logging medication:", error.message);
      Platform.OS === "android"
        ? ToastAndroid.show("❌ Failed to log medication", ToastAndroid.SHORT)
        : Alert.alert("Error", "Failed to log medication");
    } else {
      const message =
        status === "taken"
          ? "✅ Medication marked as Taken"
          : status === "missed"
          ? "❌ Medication marked as Missed"
          : "⏭ Medication marked as Skipped";

      Platform.OS === "android"
        ? ToastAndroid.show(message, ToastAndroid.SHORT)
        : Alert.alert("Success", message);
    }
  };

  // Apply filter
  const filteredLogs =
    filter === "all"
      ? dayLogs
      : dayLogs.filter((log) => log.status === filter);

  return (
    <View style={styles.container}>
      {/* Calendar */}
      <Calendar
        markedDates={markedDates}
        markingType={"multi-dot"}
        onDayPress={(day) => setSelectedDate(day.dateString)}
      />

      <Text style={styles.sectionTitle}>Medications on {selectedDate}</Text>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {["all", "taken", "missed", "skipped"].map((f) => (
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
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : filteredLogs.length === 0 ? (
        <Text style={styles.noData}>No logs match this filter.</Text>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.medName}>
                {item.medications?.medication_name || "Unknown"}
              </Text>
              <Text style={styles.dosage}>{item.medications?.dosage || ""}</Text>
              <Text
                style={[
                  styles.status,
                  item.status === "taken"
                    ? { color: "green" }
                    : item.status === "missed"
                    ? { color: "red" }
                    : { color: "orange" },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>

              {/* Action Buttons */}
              <View style={styles.logRow}>
                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "green" }]}
                  onPress={() => logMedicationStatus(item.medication_id, "taken")}
                >
                  <Text style={styles.logButtonText}>Taken</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "red" }]}
                  onPress={() => logMedicationStatus(item.medication_id, "missed")}
                >
                  <Text style={styles.logButtonText}>Missed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logButton, { backgroundColor: "orange" }]}
                  onPress={() => logMedicationStatus(item.medication_id, "skipped")}
                >
                  <Text style={styles.logButtonText}>Skipped</Text>
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
  container: { flex: 1, paddingTop: 50, backgroundColor: "#f9f9f9" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
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
  logRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  logButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  logButtonText: { color: "#fff", fontWeight: "600" },
});
