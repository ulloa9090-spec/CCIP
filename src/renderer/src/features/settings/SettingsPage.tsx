import { useEffect, useState } from 'react'
import { Button, Card, StatusBadge } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { AIKeyStatus, UserProfile } from '@shared/types/settings'

export function SettingsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [aiKeyStatus, setAIKeyStatus] = useState<AIKeyStatus | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.settings.getProfile().then((p) => {
      setProfile(p)
      setDisplayName(p.displayName)
    })
    window.studyos.settings.getAIKeyStatus().then(setAIKeyStatus)
  }, [])

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
    </div>
  )
}
