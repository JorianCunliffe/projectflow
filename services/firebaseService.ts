import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { Project, AppSettings } from '../types';

const CONFIG_STORAGE_KEY = 'projectflow_firebase_config';
const DISCONNECT_FLAG_KEY = 'projectflow_manual_disconnect';

// User provided configuration
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyDPFo1kN2hV1xK3a6lFeGXgUuUnJEfKGH4",
  authDomain: "projectflow-storage.firebaseapp.com",
  databaseURL: "https://projectflow-storage-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "projectflow-storage",
  storageBucket: "projectflow-storage.firebasestorage.app",
  messagingSenderId: "282501228704",
  appId: "1:282501228704:web:e0dae10ef3f6cd9b8b81c5",
  measurementId: "G-JCVTVXCS8T"
};

let db: any = null;
let isConfigured = false;

// specific parsing to handle the user pasting the raw JS object from Firebase console
const parseConfig = (raw: string | null) => {
  if (!raw) return null;
  
  // 1. Try strict JSON parse first (fastest/safest)
  try {
    return JSON.parse(raw);
  } catch (e) {
    // 2. If JSON fails, assume it's a JavaScript Object Literal (e.g. copied from code)
    try {
      // Remove comments (single line // and multi-line /* */)
      // This is crucial because { ... } might contain comments which new Function handles, 
      // but if the braces are commented out, we need to know.
      // Also, finding the first '{' is safer if comments are removed.
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
         return null;
      }
      
      // Extract just the object literal part: { key: "value", ... }
      const objectLiteral = cleaned.substring(firstBrace, lastBrace + 1);
      
      // Use Function constructor to parse the JS object literal.
      // This natively handles:
      // - Trailing commas
      // - Unquoted keys
      // - Single vs Double quotes
      // - Whitespace
      // Note: We use the cleaned string to ensure no malicious code outside the braces runs,
      // though inside the braces code execution is still possible (e.g. { a: (()=>{})() }).
      // Given this is a user-configuration input for their own local app, this is acceptable.
      const fn = new Function('return ' + objectLiteral);
      return fn();
    } catch (e2) {
      console.error("Config parsing failed:", e2);
      return null;
    }
  }
};

try {
  // Check if manually disconnected to prevent auto-reconnect loop
  const isManuallyDisconnected = localStorage.getItem(DISCONNECT_FLAG_KEY) === 'true';

  if (!isManuallyDisconnected) {
    // Check local storage first, otherwise use default
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    const config = saved ? parseConfig(saved) : DEFAULT_CONFIG;
    
    if (config && config.databaseURL) {
      const app = initializeApp(config);
      db = getDatabase(app);
      isConfigured = true;
    }
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

export const firebaseService = {
  isConfigured: () => isConfigured,

  configure: (configString: string) => {
    const config = parseConfig(configString);
    if (config && config.databaseURL) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      localStorage.removeItem(DISCONNECT_FLAG_KEY); // Clear manual disconnect flag
      window.location.reload();
      return true;
    }
    return false;
  },

  disconnect: () => {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    localStorage.setItem(DISCONNECT_FLAG_KEY, 'true'); // Set manual disconnect flag
    window.location.reload();
  },

  subscribe: (
    callback: (data: { projects: Project[], settings: AppSettings } | null) => void,
    onError?: (error: Error) => void
  ) => {
    if (!db) return () => {};

    const dataRef = ref(db, 'projectflow_v1');
    return onValue(dataRef, 
      (snapshot) => {
        const data = snapshot.val();
        callback(data);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },

  save: async (data: { projects: Project[], settings: AppSettings }) => {
    if (!db) return;
    const dataRef = ref(db, 'projectflow_v1');
    
    // Sanitize data to remove undefined values which Firebase rejects.
    // JSON.stringify removes keys with undefined values in objects.
    const cleanData = JSON.parse(JSON.stringify({
      projects: data.projects || [],
      settings: data.settings,
      lastUpdated: Date.now()
    }));

    await set(dataRef, cleanData);
  }
};