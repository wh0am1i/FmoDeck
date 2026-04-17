type UpgradeFn = (db: IDBDatabase, oldVersion: number, newVersion: number) => void

function asPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function openDatabase(
  name: string,
  version: number,
  upgrade: UpgradeFn
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (event) => {
      upgrade(req.result, event.oldVersion, event.newVersion ?? version)
    }
  })
}

export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
    req.onblocked = () => reject(new Error(`Delete of ${name} blocked`))
  })
}

export async function putItem<T>(
  db: IDBDatabase,
  store: string,
  value: T,
  key?: IDBValidKey
): Promise<void> {
  const tx = db.transaction(store, 'readwrite')
  const req =
    key === undefined
      ? tx.objectStore(store).put(value)
      : tx.objectStore(store).put(value, key)
  await asPromise(req)
}

export async function getItem<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const tx = db.transaction(store, 'readonly')
  return (await asPromise(tx.objectStore(store).get(key))) as T | undefined
}

export async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  const tx = db.transaction(store, 'readonly')
  return (await asPromise(tx.objectStore(store).getAll())) as T[]
}

export async function getAllByIndex<T>(
  db: IDBDatabase,
  store: string,
  indexName: string,
  key: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const tx = db.transaction(store, 'readonly')
  const idx = tx.objectStore(store).index(indexName)
  return (await asPromise(idx.getAll(key))) as T[]
}

export async function deleteItem(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey
): Promise<void> {
  const tx = db.transaction(store, 'readwrite')
  await asPromise(tx.objectStore(store).delete(key))
}
