import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ensureAppDirectories } from './filesystem/paths'
import { closeDatabase, getDatabase } from './database/connection'
import { runMigrations } from './database/migrations'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerDocumentsIpc } from './ipc/documentsIpc'
import { registerRetrievalIpc } from './ipc/retrievalIpc'
import { registerTutorIpc } from './ipc/tutorIpc'
import { registerCoursesIpc } from './ipc/coursesIpc'
import { registerStudyIpc } from './ipc/studyIpc'
import { registerNotesIpc } from './ipc/notesIpc'
import { registerExamsIpc } from './ipc/examsIpc'
import { registerMasteryIpc } from './ipc/masteryIpc'
import { registerPlanIpc } from './ipc/planIpc'
import { registerFlashcardsIpc } from './ipc/flashcardsIpc'
import { LocalEmbeddingProvider } from './ai/localEmbeddingProvider'
import { logger } from './logging/logger'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'StudyOS',
    backgroundColor: '#0a0e1a',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // All external links open in the OS browser, never inside the app window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.studyos.app')

  ensureAppDirectories()
  const db = getDatabase()
  runMigrations(db)
  registerSettingsIpc(db)
  // One embedding pipeline instance shared by ingestion and search so the
  // (large, ~90MB) model loads once, not twice.
  const embeddings = new LocalEmbeddingProvider()
  const documentQueue = registerDocumentsIpc(db, embeddings)
  registerRetrievalIpc(db, embeddings)
  registerTutorIpc(db, embeddings)
  registerCoursesIpc(db, embeddings)
  registerStudyIpc(db)
  registerNotesIpc(db)
  registerExamsIpc(db, embeddings)
  registerMasteryIpc(db)
  registerPlanIpc(db)
  registerFlashcardsIpc(db, embeddings)
  documentQueue.reconcileOrphanedJobs()
  logger.info('StudyOS main process ready')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
