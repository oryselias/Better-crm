import { openDB, DBSchema, IDBPDatabase } from "idb";

interface CRMOfflineDB extends DBSchema {
    patients: {
        key: string;
        value: {
            id: string;
            data: Record<string, unknown>;
            updatedAt: number;
        };
        indexes: { "by-updated": number };
    };
}

let dbPromise: Promise<IDBPDatabase<CRMOfflineDB>> | null = null;

export async function getDB() {
    if (typeof window === "undefined") return null;

    if (!dbPromise) {
        dbPromise = openDB<CRMOfflineDB>("better-crm-offline", 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("patients")) {
                    const store = db.createObjectStore("patients", { keyPath: "id" });
                    store.createIndex("by-updated", "updatedAt");
                }
            },
        });
    }
    return dbPromise;
}

export async function cachePatientData(id: string, data: Record<string, unknown>) {
    const db = await getDB();
    if (!db) return;
    await db.put("patients", {
        id,
        data,
        updatedAt: Date.now(),
    });
}

export async function getCachedPatientData(id: string) {
    const db = await getDB();
    if (!db) return null;
    const record = await db.get("patients", id);
    return record?.data || null;
}
