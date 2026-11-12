import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { TextField } from '../components/fields'
import { Card, Spinner } from '../components/surfaces'
import { Logo } from '../components/Logo'
import { IconCheck, IconKey } from '../components/icons'
import { useSnack } from '../components/overlays'
import './pages.css'

export default function Connection() {
  const snack = useSnack()
  const qc = useQueryClient()
  const [serverUrl, setServerUrl] = useState('https://mail.devorev.com')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; version?: string; error?: string } | null>(null)

  const testMut = useMutation({
    mutationFn: () => window.api.testConnection(serverUrl, apiKey),
    onSuccess: (r) => setTest(r)
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      await window.api.saveConnection(serverUrl, apiKey, '', 993)
      await qc.invalidateQueries()
    },
    onSuccess: () => snack('Connected. Welcome aboard.', 'success'),
    onError: (e) => snack((e as Error).message, 'error')
  })

  const canSave = serverUrl.trim().length > 8 && apiKey.trim().length > 10 && !saveMut.isPending

  return (
    <div className="connect-wrap">
      <motion.div initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
        <Card className="connect-card">
          <div className="connect-hero">
            <div className="connect-logo">
              <Logo size={46} />
            </div>
            <h1>Connect to mailcow</h1>
            <p className="dim">Sign in with a read-write API key to manage your domains, mailboxes and inboxes.</p>
          </div>

          <TextField
            label="Server URL"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mail.example.com"
          />
          <TextField
            label="API key (read-write)"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setTest(null)
            }}
            placeholder="Paste from mailcow UI → System → Configuration → Access"
            suffix={
              <button className="icon-btn" onClick={() => setShowKey(!showKey)} tabIndex={-1} aria-label="toggle">
                {showKey ? 'Hide' : 'Show'}
              </button>
            }
          />

          {test && (
            <div className={`test-result ${test.ok ? 'test-ok' : 'test-bad'}`}>
              {test.ok ? <IconCheck size={17} /> : <span>✕</span>}
              <span>
                {test.ok
                  ? `Connected — mailcow ${test.version ?? ''}`.trim()
                  : `Failed: ${test.error}`}
              </span>
            </div>
          )}

          <div className="connect-actions">
            <Button variant="outlined" onClick={() => testMut.mutate()} disabled={apiKey.trim().length < 5} loading={testMut.isPending}>
              Test connection
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={!canSave} icon={<IconKey size={18} />}>
              Save & continue
            </Button>
          </div>

          <p className="connect-note dim">
            The key never leaves this machine — it is stored encrypted with Windows DPAPI and only used by the app's
            backend. Create one in the mailcow UI under <b>System → Configuration → Access → API</b> with read-write access.
          </p>
          {saveMut.isPending && (
            <div className="connect-saving">
              <Spinner /> Saving…
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
