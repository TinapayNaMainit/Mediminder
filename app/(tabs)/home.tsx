import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";

const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

interface Medication {
  id: string;
  medication_name: string;
  dosage?: string;
  dosage_unit?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Companion state
  const [aiVisible, setAiVisible] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);

  // Fetch meds
  const fetchMedications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setMedications(data as Medication[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMedications();

    // Realtime updates
    const channel = supabase
      .channel("medications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medications" },
        () => {
          fetchMedications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Delete med
  const deleteMedication = async (id: string) => {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) Alert.alert("Error deleting medication");
  };

  // =============================
  // AI Companion
  // =============================
  useEffect(() => {
    const initSession = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      // find or create session
      let { data: sessions } = await supabase
        .from("ai_sessions")
        .select("id")
        .eq("user_id", user.user.id)
        .limit(1);

      let sessionId: string;
      if (!sessions || sessions.length === 0) {
        const { data, error } = await supabase
          .from("ai_sessions")
          .insert({ user_id: user.user.id })
          .select()
          .single();
        if (error) {
          console.error(error);
          return;
        }
        sessionId = data.id;
      } else {
        sessionId = sessions[0].id;
      }
      setAiSessionId(sessionId);

      // fetch past messages
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (msgs) setAiMessages(msgs as AIMessage[]);
    };

    initSession();
  }, []);

  const sendMessage = async () => {
    if (!aiInput.trim() || !aiSessionId) return;
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: aiInput.trim(),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput("");

    await supabase.from("ai_messages").insert({
      session_id: aiSessionId,
      role: "user",
      content: userMsg.content,
    });

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(userMsg.content);
      const reply = result.response.text();

      const aiMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      };
      setAiMessages((prev) => [...prev, aiMsg]);

      await supabase.from("ai_messages").insert({
        session_id: aiSessionId,
        role: "assistant",
        content: reply,
      });
    } catch (err) {
      console.error("AI error:", err);
    }
  };

  // =============================
  // Expiry Check
  // =============================
  const isExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "white" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 15 }}>
        Medications
      </Text>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: isExpired(item.end_date) ? "red" : "#ddd",
                borderRadius: 10,
                marginBottom: 10,
                backgroundColor: isExpired(item.end_date)
                  ? "#ffe5e5"
                  : "#f9f9f9",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600" }}>
                {item.medication_name}
              </Text>
              <Text>
                {item.dosage} {item.dosage_unit} • {item.frequency}
              </Text>
              {item.notes ? <Text>Notes: {item.notes}</Text> : null}
              {item.end_date && (
                <Text>
                  Ends:{" "}
                  {new Date(item.end_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              )}
              {isExpired(item.end_date) && (
                <Text style={{ color: "red", fontWeight: "bold" }}>
                  ⚠️ Expired
                </Text>
              )}

              <TouchableOpacity
                style={{
                  marginTop: 8,
                  padding: 8,
                  backgroundColor: "red",
                  borderRadius: 6,
                }}
                onPress={() =>
                  Alert.alert(
                    "Delete",
                    "Are you sure you want to delete?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteMedication(item.id),
                      },
                    ]
                  )
                }
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Floating AI Chat Head */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: "#007AFF",
          borderRadius: 30,
          padding: 15,
          elevation: 5,
        }}
        onPress={() => setAiVisible(true)}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>AI</Text>
      </TouchableOpacity>

      {/* AI Modal */}
      <Modal visible={aiVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <FlatList
            data={aiMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor:
                    item.role === "user" ? "#DCF8C6" : "#E5E5EA",
                  borderRadius: 10,
                  margin: 6,
                  padding: 10,
                  maxWidth: "75%",
                }}
              >
                <Text>{item.content}</Text>
              </View>
            )}
          />

          <View
            style={{
              flexDirection: "row",
              padding: 10,
              borderTopWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 20,
                paddingHorizontal: 15,
              }}
              placeholder="Ask me anything..."
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity
              style={{
                marginLeft: 10,
                backgroundColor: "#007AFF",
                borderRadius: 20,
                paddingHorizontal: 20,
                justifyContent: "center",
              }}
              onPress={sendMessage}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>Send</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "black",
              padding: 10,
              borderRadius: 20,
            }}
            onPress={() => setAiVisible(false)}
          >
            <Text style={{ color: "white" }}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
