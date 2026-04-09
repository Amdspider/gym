// ═══════════════════════════════════════════════════════
//   FIREBASE SYNCHRONIZATION ENGINE
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyATZBHQYh6bWjixHvJNkMqCiYEwTWY2BbY",
  authDomain: "my-project-6a39d.firebaseapp.com",
  projectId: "my-project-6a39d",
  storageBucket: "my-project-6a39d.firebasestorage.app",
  messagingSenderId: "682352483131",
  appId: "1:682352483131:web:481fdc7861b4e9364b351e",
  measurementId: "G-6LQ6GE85T5"
};

let sdkReadyPromise = null;
let sdk = null;
let app = null;
export let auth = null;
export let db = null;
let provider = null;

async function ensureFirebase() {
  if (sdkReadyPromise) return sdkReadyPromise;

  sdkReadyPromise = (async () => {
    try {
      const appSdk = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const authSdk = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const fsSdk = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

      sdk = { appSdk, authSdk, fsSdk };
      app = appSdk.initializeApp(firebaseConfig);
      auth = authSdk.getAuth(app);
      db = fsSdk.getFirestore(app);
      provider = new authSdk.GoogleAuthProvider();
      return true;
    } catch (err) {
      console.warn('Firebase SDK unavailable (offline mode):', err);
      return false;
    }
  })();

  return sdkReadyPromise;
}

export async function login(email, password) {
  const ready = await ensureFirebase();
  if (!ready || !auth) throw new Error('Cloud auth unavailable offline');
  const cred = await sdk.authSdk.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function register(email, password) {
  const ready = await ensureFirebase();
  if (!ready || !auth) throw new Error('Cloud auth unavailable offline');
  const cred = await sdk.authSdk.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const ready = await ensureFirebase();
  if (!ready || !auth) throw new Error('Cloud auth unavailable offline');
  const cred = await sdk.authSdk.signInWithPopup(auth, provider);
  return cred.user;
}

export async function logOut() {
  if (!auth) return;
  await sdk.authSdk.signOut(auth);
}

// Subscribe to auth state
export function onAuthChange(callback) {
  ensureFirebase().then((ready) => {
    if (!ready || !auth) {
      callback(null);
      return;
    }
    sdk.authSdk.onAuthStateChanged(auth, callback);
  });
  return () => {};
}

// ─── FIRESTORE SYNC ───
export async function pushStateToCloud(userId, localState) {
  if (!userId) return;
  const ready = await ensureFirebase();
  if (!ready || !db) throw new Error('Cloud sync unavailable offline');
  const userRef = sdk.fsSdk.doc(db, "users", userId);
  await sdk.fsSdk.setDoc(userRef, {
    state: JSON.stringify(localState),
    lastUpdated: new Date().toISOString()
  });
}

export async function pullStateFromCloud(userId) {
  if (!userId) return null;
  const ready = await ensureFirebase();
  if (!ready || !db) return null;
  const userRef = sdk.fsSdk.doc(db, "users", userId);
  const snap = await sdk.fsSdk.getDoc(userRef);
  if (snap.exists()) {
    const payload = snap.data() || {};
    return {
      state: JSON.parse(payload.state || '{}'),
      lastUpdated: payload.lastUpdated || null
    };
  }
  return null;
}
