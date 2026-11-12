import { getApiKey } from './vault'
import { getSettings } from './settings'

export class MailcowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MailcowError'
  }
}

function baseUrl(): string {
  const s = getSettings().serverUrl.replace(/\/+$/, '')
  if (!s) throw new MailcowError('Server URL is not configured.')
  return s
}

export function apiUrl(path: string): string {
  return `${baseUrl()}/api/v1${path}`
}

interface MailcowWriteResponse {
  type: string
  msg: unknown
}

/** unwrap mailcow's write result — returns a readable error string when not success */
export function assertWriteOk(res: unknown, fallback: string): void {
  const arr = Array.isArray(res) ? res : [res]
  const failures = (arr as MailcowWriteResponse[]).filter((r) => r && r.type !== 'success')
  if (failures.length === 0) return
  const msgs = failures.map((f) => {
    const m = f.msg
    if (Array.isArray(m)) return m.join(', ')
    if (typeof m === 'object' && m !== null) {
      // mailcow sometimes returns {"username_tld": ["reason"]} style objects
      return Object.entries(m as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
        .join('; ')
    }
    return String(m)
  })
  throw new MailcowError(msgs.join(' | ') || fallback)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getApiKey()
  if (!key) throw new MailcowError('API key is not configured.')
  let res: Response
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })
  } catch (e) {
    throw new MailcowError(`Cannot reach ${baseUrl()} — ${(e as Error).message}`)
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    const hint = res.status === 401 ? ' — the key was rejected. Create a read-write key under System → Configuration → Access → Administrators → API.' : ''
    throw new MailcowError(`HTTP ${res.status} ${res.statusText}${hint}${detail ? ` (${detail.slice(0, 200)})` : ''}`)
  }
  const text = await res.text()
  if (!text) return [] as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new MailcowError('Server returned non-JSON response (is the API enabled?).')
  }
}

export async function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

export async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
