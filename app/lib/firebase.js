import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 這裡要把你在 Firebase Console 複製的那一大段貼過來
// 如果你還沒去申請，請先暫時用空的字串，但網頁功能會壞掉
const firebaseConfig = {
  apiKey: "AIzaSyD2AJPlXwzoQ41nCHz6D7I7pEa53hzpgsc",
  authDomain: "tutoring-classes-18476.firebaseapp.com",
  projectId: "tutoring-classes-18476",
  storageBucket: "tutoring-classes-18476.firebasestorage.app",
  messagingSenderId: "472032482508",
  appId: "1:472032482508:web:abd2f38f702e79eb629e69"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);