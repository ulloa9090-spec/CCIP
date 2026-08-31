import { contextBridge, ipcRenderer } from 'electron'
import type { AIKeyStatus, UserProfile } from '../shared/types/settings'
import type {
  DocumentDetail,
  DocumentProgressEvent,
  LibraryDocument
} from '../shared/types/documents'
import type { RetrievalResult } from '../shared/types/retrieval'
import type { ConversationDetail, TutorEvent } from '../shared/types/tutor'
import type { Course, CourseDetail, CreateCourseInput } from '../shared/types/courses'
import type { StudySessionDetail } from '../shared/types/study'
import type { CreateNoteInput, Note } from '../shared/types/notes'

/**
 * Only `electron` itself (contextBridge, ipcRenderer) is available to a
 * *sandboxed* preload script (`sandbox: true` in main/index.ts) — third-party
 * node_modules packages are not resolvable there, so the preload stays
 * dependency-free by design. See docs/DECISIONS.md ADR-006.
 */
const studyos = {
  settings: {
    getProfile: (): Promise<UserProfile> => ipcRenderer.invoke('settings:getProfile'),
    updateDisplayName: (name: string): Promise<UserProfile> =>
      ipcRenderer.invoke('settings:updateDisplayName', name),
    getAIKeyStatus: (): Promise<AIKeyStatus> => ipcRenderer.invoke('settings:getAIKeyStatus'),
    setAIKey: (key: string): Promise<AIKeyStatus> => ipcRenderer.invoke('settings:setAIKey', key),
    clearAIKey: (): Promise<AIKeyStatus> => ipcRenderer.invoke('settings:clearAIKey')
  },
  documents: {
    import: (): Promise<LibraryDocument[]> => ipcRenderer.invoke('documents:import'),
    list: (): Promise<LibraryDocument[]> => ipcRenderer.invoke('documents:list'),
    get: (id: string): Promise<DocumentDetail> => ipcRenderer.invoke('documents:get', id),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('documents:delete', id),
    reindex: (id: string): Promise<void> => ipcRenderer.invoke('documents:reindex', id),
    getFileBuffer: (id: string): Promise<Uint8Array> =>
      ipcRenderer.invoke('documents:getFileBuffer', id),
    onProgress: (callback: (event: DocumentProgressEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: DocumentProgressEvent): void =>
        callback(payload)
      ipcRenderer.on('documents:progress', listener)
      return () => ipcRenderer.removeListener('documents:progress', listener)
    }
  },
  retrieval: {
    search: (query: string, documentIds?: string[]): Promise<RetrievalResult[]> =>
      ipcRenderer.invoke('retrieval:search', query, documentIds)
  },
  tutor: {
    getLatestConversation: (): Promise<ConversationDetail | null> =>
      ipcRenderer.invoke('tutor:getLatestConversation'),
    newConversation: (): Promise<ConversationDetail> => ipcRenderer.invoke('tutor:newConversation'),
    ask: (question: string, conversationId?: string): Promise<{ conversationId: string }> =>
      ipcRenderer.invoke('tutor:ask', question, conversationId),
    onEvent: (callback: (event: TutorEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: TutorEvent): void =>
        callback(payload)
      ipcRenderer.on('tutor:event', listener)
      return () => ipcRenderer.removeListener('tutor:event', listener)
    }
  },
  courses: {
    create: (input: CreateCourseInput): Promise<CourseDetail> =>
      ipcRenderer.invoke('courses:create', input),
    list: (): Promise<Course[]> => ipcRenderer.invoke('courses:list'),
    get: (id: string): Promise<CourseDetail> => ipcRenderer.invoke('courses:get', id)
  },
  study: {
    startOrResume: (courseId: string): Promise<StudySessionDetail> =>
      ipcRenderer.invoke('study:startOrResume', courseId),
    completeActivity: (activityId: string, understood: boolean): Promise<StudySessionDetail> =>
      ipcRenderer.invoke('study:completeActivity', activityId, understood)
  },
  notes: {
    create: (input: CreateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:create', input),
    listByCourse: (courseId: string): Promise<Note[]> =>
      ipcRenderer.invoke('notes:listByCourse', courseId),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id)
  }
}

export type StudyOSApi = typeof studyos

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('studyos', studyos)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.studyos = studyos
}
