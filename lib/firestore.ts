import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { app } from "./firebase";
import type { LocationPhoto } from "@/types/location";
import type { PosterOrder } from "@/types/poster";

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

// ── Username helpers ───────────────────────────────────────────────────────────

function buildBaseUsername(displayName: string | null, email: string | null): string {
  const raw = displayName
    ? displayName
    : (email?.split("@")[0] ?? "usuario");
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")       // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "")           // trim leading/trailing hyphens
    .slice(0, 30) || "usuario";
}

/** Returns uid of the user with the given username, or null if not found. */
export async function getUserByUsername(username: string): Promise<string | null> {
  const q = query(
    collection(db, "users"),
    where("username", "==", username),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Ensures the user has a unique username stored in users/{uid}.
 * If already set, returns the existing one.
 * Otherwise generates one from displayName/email, checks for collisions,
 * and saves it with setDoc merge.
 */
export async function ensureUsername(
  uid: string,
  displayName: string | null,
  email: string | null,
): Promise<string> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const existing = userSnap.data().username as string | undefined;
    if (existing) return existing;
  }

  const base = buildBaseUsername(displayName, email);
  let username = base;
  let attempt = 1;

  // Find a unique username (simple sequential collision resolution)
  while (true) {
    const ownerUid = await getUserByUsername(username);
    if (!ownerUid || ownerUid === uid) break;
    attempt++;
    username = `${base}-${attempt}`;
  }

  await setDoc(userRef, { username }, { merge: true });
  return username;
}

// ── Poster orders ──────────────────────────────────────────────────────────────

export async function savePosterOrder(order: Omit<PosterOrder, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "posterOrders"), order);
  return ref.id;
}

export async function setPosterOrderImageUrl(orderId: string, posterImageUrl: string): Promise<void> {
  await updateDoc(doc(db, "posterOrders", orderId), { posterImageUrl });
}

export async function getPosterOrder(orderId: string): Promise<PosterOrder | null> {
  const snap = await getDoc(doc(db, "posterOrders", orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<PosterOrder, "id">) };
}

export async function markOrderPaid(
  orderId: string,
  stripeSessionId: string,
  amountPaid: number,
): Promise<void> {
  await updateDoc(doc(db, "posterOrders", orderId), {
    status: "paid",
    stripeSessionId,
    amountPaid,
    paidAt: Date.now(),
  });
}

// ── Public profile ─────────────────────────────────────────────────────────────

/**
 * Returns public locations for a given username.
 * Resolves username → uid first, then queries locations where isPublic == true.
 * Returns empty array if username not found.
 */
export async function getPublicLocationsByUsername(
  username: string,
): Promise<LocationPhoto[]> {
  const uid = await getUserByUsername(username);
  if (!uid) return [];

  const q = query(
    userLocations(uid),
    where("isPublic", "==", true),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<LocationPhoto, "id">),
  }));
}
