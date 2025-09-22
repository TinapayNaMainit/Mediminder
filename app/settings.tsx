import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabaseClient";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [role, setRole] = useState<"patient" | "caregiver" | null>(null);

  // Load current settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("role, ai_companion_enabled")
        .eq("id", user.id)
        .single();

      if (data) {
        setRole(data.role);
        setAiEnabled(data.ai_companion_enabled);
      }
    };
    loadSettings();
  }, []);

  // Toggle AI companion in Supabase
  const toggleAI = async (value: boolean) => {
    setAiEnabled(value);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase
      .from("users")
      .update({ ai_companion_enabled: value })
      .eq("id", user.id);
  };

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Notifications */}
      <View style={styles.row}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
      </View>

      {/* Alarms */}
      <View style={styles.row}>
        <Text style={styles.label}>Enable Alarms</Text>
        <Switch value={alarmEnabled} onValueChange={setAlarmEnabled} />
      </View>

      {/* AI Companion */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {role === "caregiver"
            ? "Enable AI Companion (for my patients)"
            : "Enable AI Companion (for my medications)"}
        </Text>
        <Switch value={aiEnabled} onValueChange={toggleAI} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  label: { fontSize: 16 },
  logoutButton: {
    marginTop: 30,
    padding: 12,
    backgroundColor: "red",
    borderRadius: 8,
  },
  logoutText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
