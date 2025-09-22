import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="get-started" />
      <Stack.Screen name="user-selection" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}