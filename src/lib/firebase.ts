import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBUgGt7n8nadMQfDDXn55Z_IwtZm7iHkVs",
  authDomain: "dukan-ghar-4d9d4.firebaseapp.com",
  projectId: "dukan-ghar-4d9d4",
  storageBucket: "dukan-ghar-4d9d4.firebasestorage.app",
  messagingSenderId: "544625200202",
  appId: "1:544625200202:web:f001eda503d3b5d06beab3",
  measurementId: "G-8X79BMMT3R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
