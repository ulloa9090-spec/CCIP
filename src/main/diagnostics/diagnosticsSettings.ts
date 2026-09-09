import type { SettingsRepository } from '../database/repositories/settingsRepository'
import type { DiagnosticsSettings } from '../../shared/types/diagnostics'

const SETTINGS_KEY = 'diagnosticsSettings'

/**
 * On by default — a fresh install should be diagnosable without an extra
 * setup step. Spec §16: turning it off still keeps aggregate usage metrics
 * (ai_usage_records, event timings) — only the raw question text is
 * withheld, in `getDiagnosticsSettings`'s one caller (TutorService.ask()).
 */
const DEFAULTS: DiagnosticsSettings = { storeDetails: true }

export function getDiagnosticsSettings(settings: SettingsRepository): DiagnosticsSettings {
  return settings.get<DiagnosticsSettings>(SETTINGS_KEY) ?? DEFAULTS
}

export function setDiagnosticsSettings(
  settings: SettingsRepository,
  value: DiagnosticsSettings
): DiagnosticsSettings {
  settings.set(SETTINGS_KEY, value)
  return value
}
