import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAquDdsHNU3xObAkbL8_aGMrNuvPTYq3ug",
  authDomain: "college-transport-manage-546dc.firebaseapp.com",
  projectId: "college-transport-manage-546dc",
  storageBucket: "college-transport-manage-546dc.firebasestorage.app",
  messagingSenderId: "342341327341",
  appId: "1:342341327341:web:d9ce13a3044c5b7a51afe4",
  measurementId: "G-SFYF0HY525",
  databaseURL: "https://college-transport-manage-546dc-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);