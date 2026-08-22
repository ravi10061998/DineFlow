// Only `expo start --web` is exercised on this dev machine (8GB RAM makes a full
// Android/iOS emulator too heavy to run alongside the backend) — so `localhost` is the
// correct default. A device/emulator build would need this set to the machine's LAN IP
// via EXPO_PUBLIC_API_URL in mobile/.env.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api/v1";
