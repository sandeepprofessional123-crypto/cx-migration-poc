import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMhZ9tyF4j4ZZgE1zhsceoXFxZYKxrfws",
  authDomain: "cx-migration-poc.firebaseapp.com",
  projectId: "cx-migration-poc",
  storageBucket: "cx-migration-poc.firebasestorage.app",
  messagingSenderId: "67986467720",
  appId: "1:67986467720:web:9721e96f68efd6e442a83d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);