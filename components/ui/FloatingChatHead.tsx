import React, { useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Import environment variables
const API_URL_WEB = process.env.AI_SERVER_URL_WEB;
const API_URL_MOBILE = process.env.AI_SERVER_URL_MOBILE;

export default function FloatingChatHead() {
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState<{ id: string; text: string; sender: string }[]>([]);
  const [input, setInput] = useState("");

  // Use correct API URL based on platform
  const API_URL = Platform.OS === "web" ? API_URL_WEB : API_URL_MOBILE;

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { id: Date.now().toString(), text: input, sender: "user" };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: input }],
          contextRole: "self",
        }),
      });
      const data = await response.json();

      if (data.reply) {
        const aiMessage = { id: (Date.now() + 1).toString(), text: data.reply, sender: "ai" };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("AI request failed:", error);
      const aiMessage = { id: (Date.now() + 2).toString(), text: "🤖 AI unavailable", sender: "ai" };
      setMessages((prev) => [...prev, aiMessage]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: "#4A90E2",
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 5,
          zIndex: 100,
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: "white", fontSize: 24 }}>💬</Text>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "white",
            marginTop: Platform.OS === "web" ? 50 : 60,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
              backgroundColor: "#4A90E2",
            }}
          >
            <Text style={{ fontSize: 18, color: "white", fontWeight: "bold" }}>AI Assistant</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "white", fontSize: 16 }}>✖</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={{ flex: 1, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 10,
                  marginVertical: 4,
                  alignSelf: item.sender === "user" ? "flex-end" : "flex-start",
                  backgroundColor: item.sender === "user" ? "#4A90E2" : "#EEE",
                  borderRadius: 10,
                  maxWidth: "70%",
                }}
              >
                <Text style={{ color: item.sender === "user" ? "white" : "black" }}>
                  {item.text}
                </Text>
              </View>
            )}
          />

          {/* Input */}
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              borderTopWidth: 1,
              borderColor: "#DDD",
              alignItems: "center",
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#CCC",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginRight: 8,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={{
                backgroundColor: "#4A90E2",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "white" }}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
