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
  try {
    return JSON.parse(raw);
  } catch (e) {
    try {
      const cleaned = raw
        .replace(/const\s+\w+\s*=\s*/, '') 
        .replace(/;/g, '') 
        .replace(/(\w+):/g, '"$1":') 
        .replace(/'/g, '"'); 
      return JSON.parse(cleaned);
    } catch (e2) {
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
      try {
        const app = initializeApp(config);
        db = getDatabase(app);
        isConfigured = true;
      } catch(err) {
        console.error("Firebase Init Error:", err);
      }
    }
  }
} catch (e) {
  console.error("Firebase Critical Error:", e);
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
    onData: (data: { projects: Project[], settings: AppSettings } | null) => void,
    onError?: (error: Error) => void
  ) => {
    if (!db) return () => {};

    const dataRef = ref(db, 'projectflow_v1');
    return onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      onData(data);
    }, (error) => {
      console.error("Firebase Read Error:", error);
      if (onError) onError(error);
    });
  },

  save: async (data: { projects: Project[], settings: AppSettings }) => {
    if (!db) throw new Error("Database not initialized");
    
    // SAFETY GUARD: Prevent writing empty project lists
    if (!data.projects || data.projects.length === 0) {
      console.error("FIREBASE SAFETY: Attempted to write empty project list. Operation blocked.");
      throw new Error("Safety Block: Cannot save empty project list.");
    }

    const dataRef = ref(db, 'projectflow_v1');
    
    // Sanitize data to remove undefined values which Firebase rejects.
    // JSON.stringify removes keys with undefined values in objects.
    const cleanData = JSON.parse(JSON.stringify({
      projects: data.projects || [],
      settings: data.settings,
      lastUpdated: Date.now()
    }));

    console.log('[firebaseService.save] calling set() at services/firebaseService.ts');
    await set(dataRef, cleanData);
  }
};
