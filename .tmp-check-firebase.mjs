import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD2AJPlXwzoQ41nCHz6D7I7pEa53hzpgsc",
  authDomain: "tutoring-classes-18476.firebaseapp.com",
  projectId: "tutoring-classes-18476",
  storageBucket: "tutoring-classes-18476.firebasestorage.app",
  messagingSenderId: "472032482508",
  appId: "1:472032482508:web:abd2f38f702e79eb629e69" // from app/lib/firebase.js
};

async function checkFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    console.log("App initialized. Attempting anonymous login...");
    
    // Testing the connection with auth
    await signInAnonymously(auth);
    console.log("Firebase connection SUCCESSFUL! You are connected to project:", firebaseConfig.projectId);
    process.exit(0);
  } catch (err) {
    console.error("Firebase connection FAILED:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    process.exit(1);
  }
}

checkFirebase();
