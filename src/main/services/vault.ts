import { safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'

interface VaultShape {
  apiKey?: string // base64 encrypted
  passwords: Record<string, string> // address -> base64 encrypted
}

let cache: VaultShape | null = null

function vaultPath(): string {
  return join(app.getPath('userData'), 'vault.dat')
}

function load(): VaultShape {
  if (cache) return cache
  try {
    if (existsSync(vaultPath())) {
      cache = JSON.parse(readFileSync(vaultPath(), 'utf-8')) as VaultShape
    }
  } catch {
    cache = { passwords: {} }
  }
  if (!cache) cache = { passwords: {} }
  if (!cache.passwords) cache.passwords = {}
  return cache
}

function persist(): void {
  const p = vaultPath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(cache), 'utf-8')
}

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function encrypt(plain: string): string {
  if (!encryptionAvailable()) return plain // last resort: stored as-is (Windows always has DPAPI)
  return safeStorage.encryptString(plain).toString('base64')
}

function decrypt(stored: string): string {
  if (!encryptionAvailable()) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch {
    return ''
  }
}

export function getApiKey(): string {
  const v = load()
  return v.apiKey ? decrypt(v.apiKey) : ''
}

export function setApiKey(key: string): void {
  const v = load()
  v.apiKey = encrypt(key)
  persist()
}

export function getPassword(address: string): string | null {
  const v = load()
  const stored = v.passwords[address.toLowerCase()]
  return stored ? decrypt(stored) : null
}

export function setPassword(address: string, password: string): void {
  const v = load()
  v.passwords[address.toLowerCase()] = encrypt(password)
  persist()
}

export function forgetPassword(address: string): void {
  const v = load()
  delete v.passwords[address.toLowerCase()]
  persist()
}

export function clearSecrets(): void {
  cache = { passwords: {} }
  persist()
}
