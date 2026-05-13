import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Upload, Sun, Moon, Monitor, Fingerprint } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { usePrivacyStore } from '../store/usePrivacyStore'
import { useAuthStore } from '../store/useAuthStore'
import { useBiometricStore } from '../store/useBiometricStore'
import { useTranslation } from '../hooks/useTranslation'
import { exportBackup, importBackup } from '../lib/backup'
import { isBiometricSupported, registerBiometric } from '../lib/biometric'
import { toast } from 'sonner'
import type { Theme, Language } from '../store/useSettingsStore'

export function SettingsPage() {
  const t = useTranslation()
  const { theme, setTheme, language, setLanguage } = useSettingsStore()
  const { privacyMode, togglePrivacy } = usePrivacyStore()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const { isEnabled: biometricEnabled, enable: enableBiometric, disable: disableBiometric } = useBiometricStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [backupPassword, setBackupPassword] = useState('')

  useEffect(() => {
    isBiometricSupported().then(setBiometricSupported)
  }, [])

  async function handleBiometricToggle() {
    if (biometricEnabled) {
      disableBiometric()
      toast.success(t.settings.biometricDisabled)
      return
    }
    if (!user?.id || !user?.email) return
    try {
      const credentialId = await registerBiometric(user.id, user.email)
      enableBiometric(credentialId)
      toast.success(t.settings.biometricEnabled)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg !== 'cancelled') toast.error(t.settings.biometricSetupError)
    }
  }

  async function handleExport() {
    if (!profile) return
    setExportLoading(true)
    try {
      await exportBackup(profile, backupPassword || undefined)
    } catch {
      toast.error(t.settings.exportError)
    } finally {
      setExportLoading(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setImportLoading(true)
    try {
      const { imported, errors } = await importBackup(file, profile, backupPassword || undefined)
      if (errors.length > 0) {
        toast.error(t.settings.importError)
      } else {
        toast.success(t.settings.importSuccess(imported))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'invalid_json' || msg === 'invalid_format') {
        toast.error(t.settings.invalidFile)
      } else if (msg === 'password_required') {
        toast.error(t.settings.importPasswordRequired)
      } else if (msg === 'wrong_password') {
        toast.error(t.settings.importWrongPassword)
      } else if (msg === 'wallet_key_missing') {
        toast.error(t.settings.importKeyMissing)
      } else {
        toast.error(t.settings.importError)
      }
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--page-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full transition-colors"
          style={{ color: 'var(--text-primary)', backgroundColor: 'var(--hover-item)' }}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          {t.settings.title}
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Appearance */}
        <Section title={t.settings.appearance}>
          <Row label={t.settings.theme}>
            <SegmentedControl<Theme>
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: t.settings.themeDark, icon: <Moon size={14} /> },
                { value: 'light', label: t.settings.themeLight, icon: <Sun size={14} /> },
                { value: 'system', label: t.settings.themeSystem, icon: <Monitor size={14} /> },
              ]}
            />
          </Row>
        </Section>

        {/* Language */}
        <Section title={t.settings.language}>
          <Row label={t.settings.language}>
            <SegmentedControl<Language>
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'it', label: '🇮🇹 Italiano' },
                { value: 'en', label: '🇬🇧 English' },
              ]}
            />
          </Row>
        </Section>

        {/* Privacy */}
        <Section title={t.settings.privacyMode}>
          <Row label={t.settings.privacyModeDesc}>
            <Toggle checked={privacyMode} onChange={togglePrivacy} />
          </Row>
        </Section>

        {/* Security */}
        <Section title={t.settings.security}>
          <Row label={t.settings.biometricTitle}>
            <div className="flex items-center gap-2">
              {!biometricSupported ? (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.settings.biometricNotSupported}
                </span>
              ) : (
                <Fingerprint size={16} style={{ color: 'var(--text-muted)' }} />
              )}
              <Toggle
                checked={biometricEnabled}
                onChange={biometricSupported ? handleBiometricToggle : () => {}}
              />
            </div>
          </Row>
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />
          <div className="px-4 py-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.settings.biometricDesc}
            </p>
          </div>
        </Section>

        {/* Backup */}
        <Section title={t.settings.backup}>
          <div className="space-y-1">
            {/* Password field shared between export and import */}
            <div className="px-4 py-3">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {t.settings.backupPassword}
              </label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark text-sm"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t.settings.backupPasswordDesc}
              </p>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />
            <ActionRow
              label={t.settings.exportTitle}
              description={t.settings.exportDesc}
              onClick={handleExport}
              loading={exportLoading}
              icon={<Download size={18} />}
            />
            <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />
            <ActionRow
              label={t.settings.importTitle}
              description={t.settings.importDesc}
              onClick={() => fileInputRef.current?.click()}
              loading={importLoading}
              icon={<Upload size={18} />}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </Section>

        {/* Info */}
        <Section title={t.settings.info}>
          <InfoRow label={t.settings.version} value="1.0.0" />
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />
          <InfoRow label={t.settings.stack} value={t.settings.stackValue} />
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />
          <InfoRow label={t.settings.author} value={t.settings.authorValue} />
        </Section>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function ActionRow({
  label, description, onClick, loading, icon,
}: {
  label: string
  description: string
  onClick: () => void
  loading: boolean
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-opacity disabled:opacity-50"
    >
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      <div
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ background: 'rgba(124,109,250,0.15)', color: 'var(--accent2)' }}
      >
        {loading ? (
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }}
          />
        ) : (
          icon
        )}
      </div>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium text-right max-w-[55%] leading-snug" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-12 h-6 rounded-full transition-colors duration-200"
      style={{ background: checked ? 'var(--accent2)' : 'var(--muted2)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function SegmentedControl<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
}) {
  return (
    <div
      className="flex rounded-xl p-0.5 gap-0.5"
      style={{ backgroundColor: 'var(--hover-item)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all"
          style={
            value === opt.value
              ? { backgroundColor: 'var(--panel)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
              : { color: 'var(--text-muted)' }
          }
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
