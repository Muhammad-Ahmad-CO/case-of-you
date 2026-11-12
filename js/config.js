// The Case of You — Firebase configuration.
//
// HOW TO FILL THIS IN (no command line needed):
// 1. In the Firebase console, create a project (or open the existing one).
// 2. Add a Web app (the </> icon) and copy the firebaseConfig object.
// 3. Paste the values below, directly in the GitHub web editor.
// 4. NEVER send this config in chat or email. Paste it here only.
//
// Firebase web config values are public-by-design identifiers, not secret
// keys. They are protected by Firebase App Check + API restrictions in the
// Google Cloud console. Keep the App Check settings below correct.
//
// See README.md for the full step-by-step setup guide.

export const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
};

export const APP_CHECK_CONFIG = {
  // reCAPTCHA Enterprise site key for the HOSTED site.
  // Get it from: Firebase console > Build > App Check > Apps > Web app.
  // Leave empty while testing on localhost (the debug provider is used).
  recaptchaSiteKey: "",
};

export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey) && !FIREBASE_CONFIG.apiKey.startsWith("PASTE_");
}
