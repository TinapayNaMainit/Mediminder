// lib/notifications.ts
import * as Notifications from "expo-notifications";
import { NotificationTriggerInput } from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Ask permission
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Medication reminder
export async function scheduleMedicationReminder(
  id: string,
  time: Date,
  title: string,
  body: string
) {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: time as unknown as NotificationTriggerInput, // ✅ FIX
  });
}

// Expiry alert
export async function scheduleExpiryAlert(
  id: string,
  expiryDate: Date,
  title: string,
  body: string
) {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: expiryDate as unknown as NotificationTriggerInput, // ✅ FIX
  });
}

// Missed dose
export async function scheduleMissedDoseAlert(
  id: string,
  time: Date,
  title: string,
  body: string
) {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: time as unknown as NotificationTriggerInput, // ✅ FIX
  });
}

// Cancel all
export async function cancelAllReminders() {
  return await Notifications.cancelAllScheduledNotificationsAsync();
}

// Cancel one
export async function cancelReminder(id: string) {
  return await Notifications.cancelScheduledNotificationAsync(id);
}
