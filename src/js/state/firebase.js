// ═══════════════════════════════════════════════════════
//   FIREBASE SYNCHRONIZATION ENGINE
// ═══════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATZBHQYh6bWjixHvJNkMqCiYEwTWY2BbY",
  authDomain: "my-project-6a39d.firebaseapp.com",
  projectId: "my-project-6a39d",
  storageBucket: "my-project-6a39d.firebasestorage.app",
  messagingSenderId: "682352483131",
  appId: "1:682352483131:web:481fdc7861b4e9364b351e",
  measurementId: "G-6LQ6GE85T5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

// Subscribe to auth state
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── FIRESTORE SYNC ───
export async function pushStateToCloud(userId, localState) {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    state: JSON.stringify(localState),
    lastUpdated: new Date().toISOString()
  });
}

export async function pullStateFromCloud(userId) {
  if (!userId) return null;
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return JSON.parse(snap.data().state || '{}');
  }
  return null;
}
