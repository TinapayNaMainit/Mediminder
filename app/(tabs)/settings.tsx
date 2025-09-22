import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Dimensions, Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function SimpleQRScanner({ visible, onClose, onScan }: {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}) {
  const handleOpenCamera = async () => {
    Alert.alert(
      "QR Scanner",
      "Scan a QR code to connect with a patient",
      [
        {
          text: "Simulate Scan",
          onPress: () => {
            onScan("patient-user-12345");
            onClose();
          }
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: onClose
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Ionicons name="scan-outline" size={60} color="#4facfe" style={{ marginBottom: 20 }} />
        <Text style={{ color: '#fff', fontSize: 20, marginBottom: 10, fontWeight: 'bold' }}>
          Scan Patient QR Code
        </Text>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 }}>
          Scan the QR code from the patient's "For Me" profile to connect and manage their medications
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { width: '80%' }]}
          onPress={handleOpenCamera}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.buttonText}>Start Scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { width: '80%', marginTop: 20, backgroundColor: 'rgba(255,0,0,0.3)' }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Close Scanner</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<"self" | "caregiver">("self");
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('userRole');
        if (savedRole) {
          setUserRole(savedRole as "self" | "caregiver");
        }
      } catch (error) {
        console.error('Error loading role:', error);
      }
    };

    loadUserRole();
  }, []);

  const handleShowQR = () => {
    setQrValue("mediminder-patient-12345");
  };

  const handleScan = (data: string) => {
    setScannedData(data);
    setScannerVisible(false);
    Alert.alert("Connected!", `Successfully connected to patient: ${data}`);
  };

  const renderButton = (content: React.ReactNode, onPress: () => void, narrow = false) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modalButton,
        styles.dimButton,
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
        narrow && { width: "50%" },
      ]}
    >
      {content}
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#ff9a9e", "#a18cd1", "#4facfe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.container}>
        <Text style={styles.header}>Settings</Text>

        <Text style={styles.roleIndicator}>
          {userRole === "self" ? "Patient Mode" : "Caregiver Mode"}
        </Text>

        <View
          style={[
            styles.button,
            { justifyContent: "space-between", paddingHorizontal: 20 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <Text style={[styles.buttonText, { marginLeft: 12 }]}>
              Notifications
            </Text>
          </View>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={setIsNotificationsEnabled}
            trackColor={{ false: "#767577", true: "#4facfe" }}
            thumbColor={isNotificationsEnabled ? "#fff" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (userRole === "self") {
              setQrModalVisible(true);
              setQrValue(null);
            } else {
              setScannerVisible(true);
            }
          }}
        >
          <Ionicons 
            name={userRole === "self" ? "qr-code-outline" : "scan-outline"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.buttonText}>
            {userRole === "self" ? "My QR Code" : "Scan Patient QR"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/user-selection")}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>

        {userRole === "self" && (
          <Modal
            transparent
            visible={qrModalVisible}
            animationType="slide"
            onRequestClose={() => {
              setQrValue(null);
              setQrModalVisible(false);
            }}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={["#ff9a9e", "#a18cd1", "#4facfe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.modalContent, { width: SCREEN_WIDTH * 0.85 }]}
              >
                {qrValue ? (
                  <>
                    <Text style={styles.modalTitle}>Your Patient QR Code</Text>
                    <Text style={styles.modalSubtitle}>
                      Share this code with your caregiver to allow them to manage your medications
                    </Text>
                    <View style={styles.qrContainer}>
                      <QRCode value={qrValue} size={SCREEN_WIDTH * 0.5} />
                    </View>
                    {renderButton(
                      <Text style={styles.modalButtonText}>Close</Text>,
                      () => {
                        setQrValue(null);
                        setQrModalVisible(false);
                      },
                      true
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Generate QR Code</Text>
                    <Text style={styles.modalSubtitle}>
                      Create a QR code that your caregiver can scan to connect with your account
                    </Text>
                    {renderButton(
                      <>
                        <Ionicons name="qr-code-outline" size={20} color="#fff" />
                        <Text style={[styles.modalButtonText, { marginLeft: 10 }]}>
                          Generate My QR Code
                        </Text>
                      </>,
                      handleShowQR
                    )}
                    {renderButton(
                      <Text style={styles.modalButtonText}>Close</Text>,
                      () => {
                        setQrModalVisible(false);
                      },
                      true
                    )}
                  </>
                )}
              </LinearGradient>
            </View>
          </Modal>
        )}

        {userRole === "caregiver" && (
          <SimpleQRScanner
            visible={scannerVisible}
            onClose={() => setScannerVisible(false)}
            onScan={handleScan}
          />
        )}

        {scannedData && (
          <Text style={{ color: "#fff", marginTop: 20, textAlign: "center" }}>
            Connected to: {scannedData}
          </Text>
        )}

        <Text style={styles.version}>App Version: 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
    textAlign: "center",
  },
  roleIndicator: {
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 30,
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 25,
    marginVertical: 10,
    width: "70%",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginLeft: 12, 
    color: "#fff", 
    flexShrink: 1 
  },
  version: { 
    marginTop: 40, 
    fontSize: 16, 
    color: "#fff" 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  modalContent: {
    padding: 30,
    borderRadius: 25,
    alignItems: "center",
    maxWidth: 400,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#fff",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.9,
  },
  modalButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginVertical: 10,
    width: "100%",
    minHeight: 50,
  },
  dimButton: { 
    backgroundColor: "rgba(0,0,0,0.35)" 
  },
  modalButtonText: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#fff", 
    textAlign: "center" 
  },
  qrContainer: {
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});