/**
 * IndexedDB helpers for outfit photos (blobs).
 * Photos stay off localStorage so lists stay fast and durable.
 */
const PackDB = (() => {
  const DB_NAME = 'packlist-db';
  const DB_VERSION = 1;
  const STORE = 'photos';

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function putPhoto(id, blob) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, blob, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getPhoto(id) {
    if (!id) return null;
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deletePhoto(id) {
    if (!id) return;
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Resize + compress a File/Blob to a JPEG under ~ maxEdge px. */
  function compressImage(file, maxEdge = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load image'));
      };
      img.src = url;
    });
  }

  const objectUrlCache = new Map();

  async function getObjectUrl(id) {
    if (!id) return null;
    if (objectUrlCache.has(id)) return objectUrlCache.get(id);
    const blob = await getPhoto(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(id, url);
    return url;
  }

  function revokeObjectUrl(id) {
    if (objectUrlCache.has(id)) {
      URL.revokeObjectURL(objectUrlCache.get(id));
      objectUrlCache.delete(id);
    }
  }

  return {
    putPhoto,
    getPhoto,
    deletePhoto,
    compressImage,
    getObjectUrl,
    revokeObjectUrl,
  };
})();
