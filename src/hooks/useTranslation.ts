import { useSettingsStore } from '../store/useSettingsStore'
import { translations } from '../lib/translations'

export function useTranslation() {
  const language = useSettingsStore((s) => s.language)
  return translations[language]
}
