import type { BulkConfig, CharsetOptions, WildcardMode } from './types'

export const DEFAULT_SYMBOLS = '!@#$%^&*_-+='

export function parsePattern(pattern: string): { prefix: string; suffix: string; domain: string } | null {
  const trimmed = pattern.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0) return null
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (!domain || domain.indexOf('*') !== -1) return null
  const star = local.indexOf('*')
  if (star === -1) return null
  // exactly one wildcard keeps generation deterministic
  if (local.indexOf('*', star + 1) !== -1) return null
  return { prefix: local.slice(0, star), suffix: local.slice(star + 1), domain }
}

/** build the combined character pool from the toggles */
export function buildCharset(o: CharsetOptions): string {
  let s = ''
  if (o.digits) s += '0123456789'
  if (o.lowercase) s += 'abcdefghijklmnopqrstuvwxyz'
  if (o.uppercase) s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (o.symbols) s += o.symbolSet || DEFAULT_SYMBOLS
  return s
}

export function charsetIsEmpty(o: CharsetOptions): boolean {
  return buildCharset(o).length === 0
}

export function wildcardForCount(cfg: BulkConfig, n: number): string {
  const value = String(cfg.start + n)
  return cfg.pad > 0 ? value.padStart(cfg.pad, '0') : value
}

/** browser-safe preview (renderer side; Math.random is fine for a preview) */
export function previewCandidates(cfg: BulkConfig, n = 5): { candidates: string[]; error?: string } {
  const parsed = parsePattern(cfg.pattern)
  if (!parsed) return { candidates: [], error: 'Pattern must look like prefix*@domain.tld with exactly one *.' }
  if (cfg.wildcardMode === 'random' && charsetIsEmpty(cfg.wildCharset))
    return { candidates: [], error: 'Pick at least one character set for the wildcard.' }
  const charset = cfg.wildcardMode === 'random' ? buildCharset(cfg.wildCharset) : ''
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const w =
      cfg.wildcardMode === 'count'
        ? wildcardForCount(cfg, i)
        : Array.from({ length: cfg.wildLength }, () => charset[Math.floor(Math.random() * charset.length)]).join('')
    out.push((parsed.prefix + w + parsed.suffix + '@' + parsed.domain).toLowerCase())
  }
  return { candidates: out }
}

/** mailcow rejects weak passwords — pre-validate so users get a friendly error */
export function passwordIssues(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length
  if (classes < 2) return 'Password must mix at least two of: letters, digits, symbols.'
  return null
}

/** charset validity shared by main + renderer */
export function wildcardModeValid(cfg: BulkConfig): string | null {
  if (cfg.wildcardMode === 'random' && charsetIsEmpty(cfg.wildCharset))
    return 'Pick at least one character set for the wildcard.'
  if (cfg.wildcardMode === 'count' && cfg.count < 1) return 'Create at least one account.'
  return null
}

// re-export type helpers so the renderer can use the same vocabulary
export type { WildcardMode }
