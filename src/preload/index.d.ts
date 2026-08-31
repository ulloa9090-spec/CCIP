import type { StudyOSApi } from './index'

declare global {
  interface Window {
    studyos: StudyOSApi
  }
}
