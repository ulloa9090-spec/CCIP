import type { Project } from '../engine/types'
import type { ProjectRepository } from './repository'

/**
 * In-memory fallback used when IndexedDB is unavailable or throws (a
 * sandboxed preview context, storage blocked, private browsing). Data
 * survives only for the current page session — never silently pretended to
 * be durable when it isn't (see safeRepository's persistence-mode flag).
 */
const store = new Map<string, Project>()

export const memoryRepository: ProjectRepository = {
  async list() {
    return Array.from(store.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async get(id) {
    return store.get(id)
  },
  async save(project) {
    store.set(project.id, project)
  },
  async remove(id) {
    store.delete(id)
  },
}
