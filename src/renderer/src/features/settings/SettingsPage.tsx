import { useEffect, useState } from 'react'
import { Button, Card, StatusBadge } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import { applyTheme } from '../../app/theme'
import type { AIKeyStatus, Theme, UserProfile } from '@shared/types/settings'

export function SettingsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [aiKeyStatus, setAIKeyStatus] = useState<AIKeyStatus | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const [theme, setTheme] = useState<Theme | null>(null)

  const [backupPath, setBackupPath] = useState<string | null>(null)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)

  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [exportingNotes, setExportingNotes] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.settings.getProfile().then((p) => {
      setProfile(p)
      setDisplayName(p.displayName)
    })
    window.studyos.settings.getAIKeyStatus().then(setAIKeyStatus)
    window.studyos.settings.getTheme().then(setTheme)
  }, [])

  async function handleSetTheme(next: Theme): Promise<void> {
    setTheme(await window.studyos.settings.setTheme(next))
    applyTheme(next)
  }

  async function handleCreateBackup(): Promise<void> {
    setCreatingBackup(true)
    setBackupError(null)
    setBackupPath(null)
    try {
      const { path } = await window.studyos.settings.createBackup()
      setBackupPath(path)
    } catch (error) {
      setBackupError(parseSerializedAppError(error).userMessage)
    } finally {
      setCreatingBackup(false)
    }
  }

  async function handleRevealBackup(): Promise<void> {
    if (!backupPath) return
    await window.studyos.settings.revealBackup(backupPath)
  }

  async function handleExportNotes(): Promise<void> {
    setExportingNotes(true)
    setExportError(null)
    setExportMessage(null)
    try {
      const { path } = await window.studyos.settings.exportNotes()
      setExportMessage(path ? `Notas exportadas a ${path}` : null)
    } catch (error) {
      setExportError(parseSerializedAppError(error).userMessage)
    } finally {
      setExportingNotes(false)
    }
  }

  async function handleSaveName(): Promise<void> {
    setSavingName(true)
    setNameError(null)
    try {
      setProfile(await window.studyos.settings.updateDisplayName(displayName))
    } catch (error) {
      setNameError(parseSerializedAppError(error).userMessage)
    } finally {
      setSavingName(false)
    }
  }

  async function handleSaveKey(): Promise<void> {
    setSavingKey(true)
    setKeyError(null)
    try {
      setAIKeyStatus(await window.studyos.settings.setAIKey(apiKeyInput))
      setApiKeyInput('')
    } catch (error) {
      setKeyError(parseSerializedAppError(error).userMessage)
    } finally {
      setSavingKey(false)
    }
  }

  async function handleClearKey(): Promise<void> {
    setAIKeyStatus(await window.studyos.settings.clearAIKey())
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card>
        <h2 className="text-sm font-semibold text-text-primary">General</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Tu nombre se usa en los saludos de la aplicación.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
            placeholder="Tu nombre"
            aria-label="Tu nombre"
          />
          <Button
            size="sm"
            onClick={handleSaveName}
            disabled={savingName || displayName.trim().length === 0}
          >
            Guardar
          </Button>
        </div>
        {nameError && <p className="mt-2 text-xs text-danger">{nameError}</p>}
        {profile && (
          <p className="mt-2 text-xs text-text-muted">
            Última actualización: {new Date(profile.updatedAt).toLocaleString('es')}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">AI Provider</h2>
          {aiKeyStatus && (
            <StatusBadge tone={aiKeyStatus.configured ? 'success' : 'muted'}>
              {aiKeyStatus.configured
                ? `Configurada · termina en ${aiKeyStatus.lastFour}`
                : 'No configurada'}
            </StatusBadge>
          )}
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Clave de OpenAI, cifrada con el almacenamiento seguro del sistema. Nunca se guarda en
          texto plano.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
            placeholder="sk-..."
            aria-label="Clave de OpenAI"
          />
          <Button
            size="sm"
            onClick={handleSaveKey}
            disabled={savingKey || apiKeyInput.trim().length === 0}
          >
            Guardar
          </Button>
          {aiKeyStatus?.configured && (
            <Button size="sm" variant="ghost" onClick={handleClearKey}>
              Eliminar
            </Button>
          )}
        </div>
        {keyError && <p className="mt-2 text-xs text-danger">{keyError}</p>}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary">Apariencia</h2>
        <p className="mt-1 text-xs text-text-secondary">
          El modo oscuro es la identidad visual base de StudyOS; el modo claro es una alternativa.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant={theme === 'dark' ? 'primary' : 'ghost'}
            onClick={() => handleSetTheme('dark')}
            disabled={theme === null}
          >
            Oscuro
          </Button>
          <Button
            size="sm"
            variant={theme === 'light' ? 'primary' : 'ghost'}
            onClick={() => handleSetTheme('light')}
            disabled={theme === null}
          >
            Claro
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary">Datos</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Todo tu progreso vive únicamente en este equipo. Crea una copia de seguridad periódica
          para no perderlo.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? 'Creando copia...' : 'Crear copia de seguridad'}
            </Button>
            {backupPath && (
              <Button size="sm" variant="ghost" onClick={handleRevealBackup}>
                Ver copia
              </Button>
            )}
          </div>
          {backupPath && <p className="text-xs text-text-muted">Copia creada en: {backupPath}</p>}
          {backupError && <p className="text-xs text-danger">{backupError}</p>}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button size="sm" variant="ghost" onClick={handleExportNotes} disabled={exportingNotes}>
              {exportingNotes ? 'Exportando...' : 'Exportar notas (.md)'}
            </Button>
          </div>
          {exportMessage && <p className="text-xs text-text-muted">{exportMessage}</p>}
          {exportError && <p className="text-xs text-danger">{exportError}</p>}
        </div>
      </Card>
    </div>
  )
}
