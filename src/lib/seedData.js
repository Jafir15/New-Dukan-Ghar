import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

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
const db = getFirestore(app);

const categories = [
  { name: "Grocery", nameUrdu: "کریانہ", type: "product", icon: "🛒" },
  { name: "Vegetables", nameUrdu: "سبزیاں", type: "product", icon: "🥦" },
  { name: "Fruits", nameUrdu: "پھل", type: "product", icon: "🍎" },
  { name: "Dairy", nameUrdu: "ڈیری", type: "product", icon: "🥛" },
  { name: "Transport", nameUrdu: "ٹرانسپورٹ", type: "vehicle", icon: "🚚" }
];

const vehicles = [
  { name: "Rickshaw", nameUrdu: "رکشہ", type: "rickshaw", baseRent: 200, imageUrl: "https://picsum.photos/seed/rickshaw/300/200" },
  { name: "Chigchi", nameUrdu: "چنگچی", type: "chigchi", baseRent: 150, imageUrl: "https://picsum.photos/seed/chigchi/300/200" },
  { name: "Carry Bolan", nameUrdu: "کیری بولان", type: "carry_bolan", baseRent: 500, imageUrl: "https://picsum.photos/seed/carry/300/200" }
];

const placeholderImg = (seed) => `https://picsum.photos/seed/${seed}/300/200`;

async function clearCollection(colName) {
  const snap = await getDocs(collection(db, colName));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id));
  }
}

async function seed() {
  console.log("Clearing existing data...");
  await clearCollection("categories");
  await clearCollection("products");
  await clearCollection("vehicles");

  console.log("Seeding categories...");
  const catRefs = [];
  for (const cat of categories) {
    const ref = await addDoc(collection(db, "categories"), cat);
    catRefs.push({ id: ref.id, ...cat });
    console.log(`- Added category ${cat.name}`);
  }

  console.log("Seeding products...");
  for (const cat of catRefs.filter(c => c.type === "product")) {
    for (let i = 1; i <= 2; i++) {
      const product = {
        name: `${cat.name} Product ${i}`,
        nameUrdu: `${cat.nameUrdu} پراڈکٹ ${i}`,
        price: Math.floor(Math.random() * 500) + 50,
        unit: "kg",
        stock: Math.floor(Math.random() * 100) + 10,
        categoryId: cat.id,
        featured: i === 1,
        imageUrl: placeholderImg(`${cat.name}-${i}`)
      };
      await addDoc(collection(db, "products"), product);
      console.log(`- Added ${product.name}`);
    }
  }

  console.log("Seeding vehicles...");
  for (const v of vehicles) {
    await addDoc(collection(db, "vehicles"), v);
    console.log(`- Added vehicle ${v.name}`);
  }

  console.log("Seeding completed.");
}

seed().catch(console.error);
