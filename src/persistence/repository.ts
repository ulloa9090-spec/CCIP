import type { Project } from '../engine/types'

/**
 * Repository boundary (docs/ARCHITECTURE.md §8): UI and engine code depend
 * only on this interface. The IndexedDB implementation below can be swapped
 * for a server-backed one (Phase 6) without touching anything above it.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | undefined>
  save(project: Project): Promise<void>
  remove(id: string): Promise<void>
}
