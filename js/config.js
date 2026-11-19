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

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBO_agG3hhyZeWOEH7HnT3tENZIWUIYaUU",
  authDomain: "the-case-of-you.firebaseapp.com",
  projectId: "the-case-of-you",
  storageBucket: "the-case-of-you.firebasestorage.app",
  messagingSenderId: "543269111470",
  appId: "1:543269111470:web:805ed2b7a4693aa98fcf3f",
  measurementId: "G-3MX0EDT4F0"
};

export const APP_CHECK_CONFIG = {
  // reCAPTCHA Enterprise site key for the HOSTED site.
  // Get it from: Firebase console > Build > App Check > Apps > Web app.
  // Leave empty while testing on localhost (the debug provider is used).
  recaptchaSiteKey: "6Ld5VSguAAAAAGlFPPG20Q5D8aBslTC-GNwRWV10",
};

export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey) && !FIREBASE_CONFIG.apiKey.startsWith("PASTE_");
}
