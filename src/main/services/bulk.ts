import { randomInt } from 'crypto'
import { get, post, assertWriteOk } from './mailcow'
import { setPassword } from './vault'
import { parsePattern, buildCharset, wildcardForCount, passwordIssues, wildcardModeValid } from '@shared/pattern'
import type { BulkConfig, BulkReport, BulkProgress, Mailbox } from '@shared/types'

function randomString(charset: string, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += charset[randomInt(0, charset.length)]
  return out
}

export function generatePassword(o: BulkConfig['randomPasswordCharset'], length: number): string {
  const charset = buildCharset(o)
  if (charset.length === 0) throw new Error('Password needs at least one character set.')
  return randomString(charset, Math.max(8, length))
}

/**
 * Plan the local parts for a bulk run, guaranteeing uniqueness against
 * existing mailboxes and within the batch.
 *  - count mode: the counter keeps advancing past taken numbers
 *  - random mode: regenerate until free (bounded retries)
 */
export function generateLocalParts(
  cfg: BulkConfig,
  existingLocalParts: Set<string>
): { locals: string[]; skipped: number; error?: string } {
  const parsed = parsePattern(cfg.pattern)
  if (!parsed) return { locals: [], skipped: 0, error: 'Pattern must look like prefix*@domain.tld with exactly one *.' }
  const modeError = wildcardModeValid(cfg)
  if (modeError) return { locals: [], skipped: 0, error: modeError }

  const taken = new Set(existingLocalParts)
  const locals: string[] = []
  let skipped = 0

  if (cfg.wildcardMode === 'count') {
    let n = 0
    while (locals.length < cfg.count) {
      const local = parsed.prefix + wildcardForCount(cfg, n) + parsed.suffix
      n++
      if (taken.has(local)) {
        skipped++
        continue
      }
      taken.add(local)
      locals.push(local)
      // hard stop so a pathological start value can't loop forever
      if (n > cfg.count * 100 + 10000) return { locals, skipped, error: 'Could not find enough free numbers.' }
    }
    return { locals, skipped }
  }

  const charset = buildCharset(cfg.wildCharset)
  for (let i = 0; i < cfg.count; i++) {
    let attempts = 0
    for (;;) {
      attempts++
      if (attempts > 200)
        return { locals, skipped, error: `Wildcard space too small — stuck at ${i + 1} of ${cfg.count}.` }
      const local = parsed.prefix + randomString(charset, cfg.wildLength) + parsed.suffix
      if (taken.has(local)) continue
      taken.add(local)
      locals.push(local)
      break
    }
  }
  return { locals, skipped }
}

function validateConfig(cfg: BulkConfig): string | null {
  const parsed = parsePattern(cfg.pattern)
  if (!parsed) return 'Pattern must look like prefix*@domain.tld with exactly one *.'
  const modeError = wildcardModeValid(cfg)
  if (modeError) return modeError
  if (cfg.passwordMode === 'fixed') {
    const issue = passwordIssues(cfg.fixedPassword)
    if (issue) return `Fixed password: ${issue}`
  }
  if (cfg.passwordMode === 'random' && buildCharset(cfg.randomPasswordCharset).length === 0)
    return 'Random password needs at least one character set.'
  if (cfg.quotaMb < 1) return 'Quota must be at least 1 MB.'
  return null
}

export async function runBulkCreate(
  cfg: BulkConfig,
  onProgress: (p: BulkProgress) => void
): Promise<BulkReport> {
  const configError = validateConfig(cfg)
  if (configError) throw new Error(configError)

  const parsed = parsePattern(cfg.pattern)!
  const domain = parsed.domain

  // snapshot of what already exists on this domain — the source of truth for uniqueness
  const existing = await get<Mailbox[]>(`/get/mailbox/all/${encodeURIComponent(domain)}`)
  const existingParts = new Set(
    (Array.isArray(existing) ? existing : []).map((m) => String(m.local_part ?? '').toLowerCase())
  )

  const plan = generateLocalParts(cfg, existingParts)
  if (plan.error && plan.locals.length === 0) throw new Error(plan.error)

  const report: BulkReport = { created: [], failed: [], skipped: plan.skipped }
  const total = plan.locals.length

  for (let i = 0; i < total; i++) {
    const local = plan.locals[i]
    const address = `${local}@${domain}`
    let password: string
    if (cfg.passwordMode === 'fixed') {
      password = cfg.fixedPassword
    } else {
      password = generatePassword(cfg.randomPasswordCharset, cfg.randomPasswordLength)
    }

    onProgress({
      done: i,
      total,
      current: address,
      created: report.created.length,
      failed: report.failed.length,
      skipped: report.skipped
    })

    try {
      const res = await post('/add/mailbox', {
        local_part: local,
        domain,
        password,
        password2: password,
        quota: cfg.quotaMb,
        active: 1
      })
      assertWriteOk(res, `Failed to create ${address}.`)
      report.created.push({ address, password })
      // remember it immediately so we can read this inbox later
      setPassword(address, password)
    } catch (e) {
      report.failed.push({ address, error: (e as Error).message })
    }
  }

  onProgress({
    done: total,
    total,
    current: '',
    created: report.created.length,
    failed: report.failed.length,
    skipped: report.skipped
  })

  if (plan.error) report.failed.push({ address: '(generation)', error: plan.error })
  return report
}
