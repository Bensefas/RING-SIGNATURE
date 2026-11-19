const DATABASE_NAME = "university-incident-signing-keys";
const STORE_NAME = "account-keys";
let databasePromise;

const openDatabase = () => {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("Secure browser key storage is not available."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open signing key storage."));
      request.onblocked = () => reject(new Error("Signing key storage is blocked by another browser tab."));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};

const readKey = async (storageKey) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(storageKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Unable to read a signing key."));
  });
};

const writeKeyIfAbsent = async (storageKey, keyPair) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let result = keyPair;
    const lookup = store.get(storageKey);

    lookup.onsuccess = () => {
      if (lookup.result) {
        result = lookup.result;
      } else {
        store.add(keyPair, storageKey);
      }
    };
    lookup.onerror = () => reject(lookup.error || new Error("Unable to check signing key storage."));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("Unable to save a signing key."));
    transaction.onabort = () => reject(transaction.error || new Error("Saving a signing key was aborted."));
  });
};

export const getOrCreateSigningKey = async (storageKey, createKeyPair) => {
  const existing = await readKey(storageKey);
  if (existing) return existing;

  const created = await createKeyPair();
  return writeKeyIfAbsent(storageKey, created);
};
