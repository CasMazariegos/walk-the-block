import type { Lead } from './types'

const DB_NAME = 'walk-the-block'
const STORE = 'leads'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the lead list.'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The lead list could not be updated.'))
  })
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = await openDb()
  const leads = await requestToPromise(db.transaction(STORE, 'readonly').objectStore(STORE).getAll() as IDBRequest<Lead[]>)
  db.close()
  return leads.sort((a, b) => b.createdAt - a.createdAt)
}

export async function putLead(lead: Lead): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(lead))
  db.close()
}

export async function deleteLead(id: string): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
  db.close()
}
