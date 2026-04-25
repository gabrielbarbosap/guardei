import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "firebase/firestore";
import { app } from "./firebase";
import type { LocationPhoto } from "@/types/location";

export const db = getFirestore(app);

type NewLocationInput = Omit<LocationPhoto, "id" | "createdAt"> & {
  createdAt?: number;
};

function userLocations(userId: string) {
  return collection(db, "users", userId, "locations");
}

export async function getLocations(userId: string): Promise<LocationPhoto[]> {
  const q = query(userLocations(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<LocationPhoto, "id">;
    return { id: doc.id, ...data };
  });
}

export async function addLocation(input: NewLocationInput) {
  const { userId, ...rest } = input;
  await addDoc(userLocations(userId), {
    ...rest,
    createdAt: rest.createdAt ?? Date.now(),
  });
}

export async function deleteLocation(userId: string, locationId: string) {
  await deleteDoc(doc(db, "users", userId, "locations", locationId));
}
