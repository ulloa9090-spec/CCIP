import Dexie, { type Table } from 'dexie'
import type { Project } from '../engine/types'
import type { ProjectRepository } from './repository'

class StudioDatabase extends Dexie {
  projects!: Table<Project, string>

  constructor() {
    super('childcare-financial-studio')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    })
  }
}

// Constructed lazily, inside the async methods below, so that a synchronous
// throw from Dexie/IndexedDB (blocked storage, a sandboxed preview context,
// private browsing) becomes a normal rejected promise instead of crashing
// module evaluation itself — safeRepository can then catch it and fall back.
let db: StudioDatabase | null = null
const getDb = (): StudioDatabase => {
  if (!db) db = new StudioDatabase()
  return db
}

export const indexedDbRepository: ProjectRepository = {
  async list() {
    return getDb().projects.orderBy('updatedAt').reverse().toArray()
  },
  async get(id) {
    return getDb().projects.get(id)
  },
  async save(project) {
    await getDb().projects.put(project)
  },
  async remove(id) {
    await getDb().projects.delete(id)
  },
}
