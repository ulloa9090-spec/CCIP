import { indexedDbRepository } from './indexedDbRepository'
import { memoryRepository } from './memoryRepository'
import type { ProjectRepository } from './repository'

export type PersistenceMode = 'indexeddb' | 'memory'

let mode: PersistenceMode = 'indexeddb'
export const getPersistenceMode = (): PersistenceMode => mode

/**
 * Tries IndexedDB first; the moment any call fails (blocked storage, a
 * sandboxed preview context, private browsing), permanently switches this
 * session to the in-memory fallback rather than leaving the app stuck on a
 * rejected promise — that failure mode is otherwise indistinguishable from
 * "the app doesn't load" (spec §60: never let all data silently disappear
 * without the user knowing, but also never let storage failure block the
 * app from opening at all).
 */
const withFallback = async <T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
  if (mode === 'memory') return fallback()
  try {
    return await primary()
  } catch (err) {
    console.warn('IndexedDB unavailable — falling back to in-memory storage for this session. Data will not persist after reload.', err)
    mode = 'memory'
    return fallback()
  }
}

export const safeRepository: ProjectRepository = {
  list: () => withFallback(() => indexedDbRepository.list(), () => memoryRepository.list()),
  get: (id) => withFallback(() => indexedDbRepository.get(id), () => memoryRepository.get(id)),
  save: (project) => withFallback(() => indexedDbRepository.save(project), () => memoryRepository.save(project)),
  remove: (id) => withFallback(() => indexedDbRepository.remove(id), () => memoryRepository.remove(id)),
}
