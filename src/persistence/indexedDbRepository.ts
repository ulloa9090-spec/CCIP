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

const db = new StudioDatabase()

export const indexedDbRepository: ProjectRepository = {
  async list() {
    return db.projects.orderBy('updatedAt').reverse().toArray()
  },
  async get(id) {
    return db.projects.get(id)
  },
  async save(project) {
    await db.projects.put(project)
  },
  async remove(id) {
    await db.projects.delete(id)
  },
}
