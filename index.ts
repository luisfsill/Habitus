// Android runs headless JS for notification actions while the app is killed.
// Expo Router only evaluates route files when it renders, so the background
// task must be defined here, before the router entry.
import "./src/services/notification-responses";
import "expo-router/entry";
