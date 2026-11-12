import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'

export interface SettingsShape {
  serverUrl: string
  imapHost: string
  imapPort: number
  theme: 'dark' | 'light'
}

const DEFAULTS: SettingsShape = {
  serverUrl: 'https://mail.devorev.com',
  imapHost: 'mail.devorev.com',
  imapPort: 993,
  theme: 'dark'
}

let cache: SettingsShape | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): SettingsShape {
  if (cache) return cache
  try {
    if (existsSync(settingsPath())) {
      cache = { ...DEFAULTS, ...JSON.parse(readFileSync(settingsPath(), 'utf-8')) }
    }
  } catch {
    cache = { ...DEFAULTS }
  }
  if (!cache) cache = { ...DEFAULTS }
  return cache
}

export function updateSettings(patch: Partial<SettingsShape>): SettingsShape {
  const next = { ...getSettings(), ...patch }
  cache = next
  const p = settingsPath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function deriveImapHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname
  } catch {
    return serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}
