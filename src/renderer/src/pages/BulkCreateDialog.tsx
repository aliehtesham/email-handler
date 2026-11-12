import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, IconButton } from '../components/Button'
import { Checkbox, PasswordReveal, Segmented, SymbolSetField, TextField } from '../components/fields'
import { Chip, ProgressBar } from '../components/surfaces'
import { Dialog, useSnack } from '../components/overlays'
import {
  IconAlert,
  IconCheck,
  IconCopy,
  IconDownload,
  IconWand
} from '../components/icons'
import { copyText, saveTextFile, toCsv } from '../lib/format'
import {
  DEFAULT_SYMBOLS,
  parsePattern,
  passwordIssues,
  previewCandidates,
  wildcardModeValid
} from '@shared/pattern'
import type { BulkConfig, BulkProgress, BulkReport, CharsetOptions, Mailbox } from '@shared/types'
import './pages.css'

const allCharsets = (symbols: string): CharsetOptions => ({
  digits: true,
  lowercase: true,
  uppercase: true,
  symbols: true,
  symbolSet: symbols
})

export default function BulkCreateDialog({
  open,
  onClose,
  domain,
  existing
}: {
  open: boolean
  onClose: () => void
  domain: string
  existing: Mailbox[]
}) {
  const snack = useSnack()
  const qc = useQueryClient()

  const [cfg, setCfg] = useState<BulkConfig>({
    pattern: `*@${domain}`,
    wildcardMode: 'count',
    count: 10,
    start: 1,
    pad: 0,
    wildLength: 4,
    wildCharset: { digits: true, lowercase: false, uppercase: false, symbols: false, symbolSet: DEFAULT_SYMBOLS },
    passwordMode: 'random',
    fixedPassword: '',
    randomPasswordLength: 16,
    randomPasswordCharset: allCharsets(DEFAULT_SYMBOLS),
    quotaMb: 1024
  })
  const [showFixed, setShowFixed] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form')
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [report, setReport] = useState<BulkReport | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // reset when reopened
  useEffect(() => {
    if (open) {
      setCfg((c) => ({ ...c, pattern: `*@${domain}` }))
      setPhase('form')
      setReport(null)
      setProgress(null)
    }
    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [open, domain])

  const patch = (p: Partial<BulkConfig>) => setCfg((c) => ({ ...c, ...p }))

  const preview = useMemo(() => previewCandidates(cfg, 6), [cfg])
  const patternOk = parsePattern(cfg.pattern) !== null
  const wildOk = wildcardModeValid(cfg) === null
  const fixedPwIssue = cfg.passwordMode === 'fixed' ? passwordIssues(cfg.fixedPassword) : null
  const takenSet = useMemo(
    () => new Set(existing.map((m) => String(m.local_part ?? '').toLowerCase())),
    [existing]
  )

  const validationError =
    (!patternOk ? 'Pattern must be like prefix*@domain.tld with one *.' : null) ??
    (!wildOk ? 'Wildcard needs at least one character set.' : null) ??
    fixedPwIssue

  const canRun = patternOk && wildOk && !fixedPwIssue && cfg.count > 0 && cfg.count <= 5000

  async function run() {
    setPhase('running')
    setProgress(null)
    unsubRef.current = window.api.onBulkProgress((p) => setProgress(p))
    try {
      const r = await window.api.bulkCreate(cfg)
      setReport(r)
      setPhase('done')
      qc.invalidateQueries({ queryKey: ['mailboxes', domain] })
      snack(`Created ${r.created.length} account${r.created.length === 1 ? '' : 's'}`, 'success')
    } catch (e) {
      snack((e as Error).message, 'error')
      setPhase('form')
    } finally {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }

  function closeIfSafe() {
    if (phase === 'running') return
    onClose()
  }

  const exportRows = (report: BulkReport) =>
    report.created.map((c) => ({ email: c.address, password: c.password }))

  return (
    <Dialog
      open={open}
      onClose={closeIfSafe}
      wide
      title="Create accounts in bulk"
      icon={<IconWand size={20} />}
      actions={
        phase === 'form' ? (
          <>
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button icon={<IconWand size={18} />} disabled={!canRun} onClick={run}>
              Create {cfg.count} account{cfg.count === 1 ? '' : 's'}
            </Button>
          </>
        ) : phase === 'running' ? (
          <Button variant="text" disabled>
            Working…
          </Button>
        ) : (
          <>
            <Button variant="text" onClick={onClose}>Close</Button>
            {report && report.created.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  icon={<IconCopy size={17} />}
                  onClick={async () => {
                    const ok = await copyText(exportRows(report).map((r) => `${r.email}:${r.password}`).join('\n'))
                    snack(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error')
                  }}
                >
                  Copy all
                </Button>
                <Button
                  variant="outlined"
                  icon={<IconDownload size={17} />}
                  onClick={async () => {
                    const p = await saveTextFile('Export credentials', `${domain}-accounts.csv`, toCsv(exportRows(report)))
                    if (p) snack(`Saved to ${p}`, 'success')
                  }}
                >
                  CSV
                </Button>
                <Button
                  variant="outlined"
                  icon={<IconDownload size={17} />}
                  onClick={async () => {
                    const p = await saveTextFile(
                      'Export credentials',
                      `${domain}-accounts.json`,
                      JSON.stringify(exportRows(report), null, 2)
                    )
                    if (p) snack(`Saved to ${p}`, 'success')
                  }}
                >
                  JSON
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {phase === 'form' && (
        <>
          <div className="bulk-section">
            <span className="label">PATTERN</span>
            <TextField
              label="Pattern"
              value={cfg.pattern}
              onChange={(e) => patch({ pattern: e.target.value })}
              error={cfg.pattern && !patternOk ? 'Use exactly one * in the local part, e.g. user*@devorev.com' : null}
              hint="The * is where the system generates — everything around it stays fixed."
              mono
            />
          </div>

          <div className="bulk-section">
            <span className="label">WILDCARD STYLE</span>
            <Segmented
              value={cfg.wildcardMode}
              onChange={(v) => patch({ wildcardMode: v })}
              options={[
                { value: 'count', label: 'Count up' },
                { value: 'random', label: 'Random' }
              ]}
            />
            {cfg.wildcardMode === 'count' ? (
              <div className="form-row">
                <TextField
                  label="Start at"
                  type="number"
                  value={cfg.start}
                  onChange={(e) => patch({ start: Number(e.target.value) })}
                />
                <TextField
                  label="Zero-pad digits"
                  type="number"
                  value={cfg.pad}
                  onChange={(e) => patch({ pad: Number(e.target.value) })}
                  hint="0 = off; 3 → 001, 002…"
                />
              </div>
            ) : (
              <div className="bulk-charset">
                <div className="form-row">
                  <TextField
                    label="Wildcard length"
                    type="number"
                    value={cfg.wildLength}
                    onChange={(e) => patch({ wildLength: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
                <div className="checkbox-line">
                  <Checkbox label="Digits 0-9" checked={cfg.wildCharset.digits} onChange={(v) => patch({ wildCharset: { ...cfg.wildCharset, digits: v } })} />
                  <Checkbox label="a-z" checked={cfg.wildCharset.lowercase} onChange={(v) => patch({ wildCharset: { ...cfg.wildCharset, lowercase: v } })} />
                  <Checkbox label="A-Z" checked={cfg.wildCharset.uppercase} onChange={(v) => patch({ wildCharset: { ...cfg.wildCharset, uppercase: v } })} />
                  <Checkbox label="Symbols" checked={cfg.wildCharset.symbols} onChange={(v) => patch({ wildCharset: { ...cfg.wildCharset, symbols: v } })} />
                </div>
                {cfg.wildCharset.symbols && (
                  <div className="symbols-edit">
                    <button className="icon-btn" onClick={() => setShowSymbols(!showSymbols)} aria-label="edit symbols">
                      {showSymbols ? 'Hide set' : 'Edit set'}
                    </button>
                    {showSymbols && (
                      <SymbolSetField
                        value={cfg.wildCharset.symbolSet || DEFAULT_SYMBOLS}
                        onChange={(v) => patch({ wildCharset: { ...cfg.wildCharset, symbolSet: v } })}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bulk-section">
            <span className="label">PASSWORDS</span>
            <Segmented
              value={cfg.passwordMode}
              onChange={(v) => patch({ passwordMode: v })}
              options={[
                { value: 'random', label: 'Random per account' },
                { value: 'fixed', label: 'Same for all' }
              ]}
            />
            {cfg.passwordMode === 'fixed' ? (
              <TextField
                label="Password for all accounts"
                type={showFixed ? 'text' : 'password'}
                value={cfg.fixedPassword}
                onChange={(e) => patch({ fixedPassword: e.target.value })}
                error={fixedPwIssue}
                suffix={PasswordReveal(showFixed, () => setShowFixed(!showFixed))}
              />
            ) : (
              <div className="form-row">
                <TextField
                  label="Password length"
                  type="number"
                  value={cfg.randomPasswordLength}
                  onChange={(e) => patch({ randomPasswordLength: Math.max(8, Number(e.target.value)) })}
                />
                <div className="checkbox-line checkbox-line-col">
                  <Checkbox label="a-z" checked={cfg.randomPasswordCharset.lowercase} onChange={(v) => patch({ randomPasswordCharset: { ...cfg.randomPasswordCharset, lowercase: v } })} />
                  <Checkbox label="A-Z" checked={cfg.randomPasswordCharset.uppercase} onChange={(v) => patch({ randomPasswordCharset: { ...cfg.randomPasswordCharset, uppercase: v } })} />
                  <Checkbox label="0-9" checked={cfg.randomPasswordCharset.digits} onChange={(v) => patch({ randomPasswordCharset: { ...cfg.randomPasswordCharset, digits: v } })} />
                  <Checkbox label="Symbols" checked={cfg.randomPasswordCharset.symbols} onChange={(v) => patch({ randomPasswordCharset: { ...cfg.randomPasswordCharset, symbols: v } })} />
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <TextField
              label="How many accounts"
              type="number"
              value={cfg.count}
              onChange={(e) => patch({ count: Math.max(1, Number(e.target.value)) })}
            />
            <TextField
              label="Quota per mailbox (MB)"
              type="number"
              value={cfg.quotaMb}
              onChange={(e) => patch({ quotaMb: Number(e.target.value) })}
            />
          </div>

          <div className="bulk-preview">
            <span className="label">PREVIEW</span>
            <div className="preview-list">
              {preview.error ? (
                <span className="preview-err">{preview.error}</span>
              ) : (
                preview.candidates.map((c, i) => (
                  <Chip key={i} tone={takenSet.has(c.split('@')[0]) ? 'error' : 'neutral'}>
                    {c}
                    {takenSet.has(c.split('@')[0]) ? ' · exists' : ''}
                  </Chip>
                ))
              )}
              {cfg.count > 6 && <Chip>+{cfg.count - 6} more (uniqueness enforced at creation)</Chip>}
            </div>
            <p className="dim preview-note">
              Existing accounts are never recreated — taken names are skipped or regenerated automatically. All
              passwords are stored encrypted so the app can read these inboxes later.
            </p>
          </div>
        </>
      )}

      {phase === 'running' && (
        <div className="bulk-running">
          <ProgressBar indeterminate />
          <div className="bulk-progress-text">
            {progress ? (
              <>
                <b>{progress.done}</b> / {progress.total} processed — creating <span className="mono">{progress.current}</span>
                <div className="bulk-counts">
                  <Chip tone="primary">{progress.created} created</Chip>
                  {progress.failed > 0 && <Chip tone="error">{progress.failed} failed</Chip>}
                  {progress.skipped > 0 && <Chip>{progress.skipped} skipped (taken)</Chip>}
                </div>
              </>
            ) : (
              'Fetching existing mailboxes…'
            )}
          </div>
        </div>
      )}

      {phase === 'done' && report && (
        <div className="bulk-results">
          <div className="bulk-counts">
            <Chip tone="primary"><IconCheck size={13} /> {report.created.length} created</Chip>
            {report.failed.length > 0 && <Chip tone="error"><IconAlert size={13} /> {report.failed.length} failed</Chip>}
            {report.skipped > 0 && <Chip>{report.skipped} skipped (already existed)</Chip>}
          </div>
          {report.created.length > 0 && (
            <div className="results-table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Password</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {report.created.map((c) => (
                    <tr key={c.address}>
                      <td className="mono truncate">{c.address}</td>
                      <td className="mono">{c.password}</td>
                      <td>
                        <IconButton
                          aria-label="copy"
                          onClick={async () => {
                            const ok = await copyText(`${c.address}:${c.password}`)
                            snack(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error')
                          }}
                        >
                          <IconCopy size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.failed.length > 0 && (
            <div className="bulk-failures">
              {report.failed.map((f) => (
                <div key={f.address} className="bulk-failure">
                  <IconAlert size={14} />
                  <span className="mono">{f.address}</span>
                  <span className="dim">{f.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
