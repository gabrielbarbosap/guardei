import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { app } from "./firebase";
import type { LocationPhoto } from "@/types/location";

export const db = getFirestore(app);

type NewLocationInput = Omit<LocationPhoto, "id" | "createdAt"> & {
  createdAt?: number;
};

export async function getLocations(userId: string): Promise<LocationPhoto[]> {
  const q = query(
    collection(db, "locations"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<LocationPhoto, "id">;
    return { id: doc.id, ...data };
  });
}

export async function addLocation(input: NewLocationInput) {
  const payload = {
    ...input,
    createdAt: input.createdAt ?? Date.now(),
  };

  await addDoc(collection(db, "locations"), payload);
}
