import { contextBridge, ipcRenderer } from 'electron'
import type { AIKeyStatus, UserProfile } from '../shared/types/settings'

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
