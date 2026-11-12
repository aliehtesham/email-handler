import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { PasswordReveal, Segmented, TextField } from '../components/fields'
import { Card, SectionTitle, Spinner } from '../components/surfaces'
import { Dialog, useSnack } from '../components/overlays'
import { IconAlert, IconCheck, IconGlobe, IconKey, IconSettings } from '../components/icons'
import './pages.css'

type Theme = 'dark' | 'light'

export default function Settings() {
  const snack = useSnack()
  const qc = useQueryClient()

  const { data: status, isLoading } = useQuery({ queryKey: ['status'], queryFn: () => window.api.getStatus() })
  const [serverUrl, setServerUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [showKey, setShowKey] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  if (status && !seeded) {
    setServerUrl(status.serverUrl)
    setImapHost(status.imapHost)
    setImapPort(String(status.imapPort))
    setSeeded(true)
  }

  const theme = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark'

  const saveMut = useMutation({
    mutationFn: () => window.api.saveConnection(serverUrl, apiKey, imapHost, Number(imapPort) || 993),
    onSuccess: async () => {
      await qc.invalidateQueries()
      snack('Settings saved', 'success')
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  const testMut = useMutation({
    mutationFn: () => window.api.testConnection(serverUrl, apiKey || '(stored)'),
    onSuccess: (r) =>
      snack(r.ok ? `Connection OK — mailcow ${r.version ?? ''}`.trim() : `Failed: ${r.error}`, r.ok ? 'success' : 'error')
  })

  const clearMut = useMutation({
    mutationFn: () => window.api.clearSecrets(),
    onSuccess: async () => {
      await qc.invalidateQueries()
      snack('Vault cleared — reconnect to continue.', 'success')
    }
  })

  if (isLoading || !status) {
    return (
      <div className="page-inner">
        <div className="center-spin"><Spinner size={30} /></div>
      </div>
    )
  }

  return (
    <div className="page-inner settings-page">
      <div className="page-head">
        <SectionTitle>Settings</SectionTitle>
      </div>

      <div className="scroll settings-scroll">
        <Card className="settings-card">
          <div className="settings-head">
            <div className="domain-icon"><IconGlobe size={20} /></div>
            <div>
              <h3>Connection</h3>
              <p className="dim">mailcow REST API + IMAP endpoints used for reading inboxes.</p>
            </div>
          </div>
          <div className="settings-grid">
            <TextField label="Server URL" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            <TextField
              label="API key (leave blank to keep current)"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status.hasApiKey ? '•••••••• stored' : 'not set'}
              suffix={PasswordReveal(showKey, () => setShowKey(!showKey))}
            />
            <div className="form-row">
              <TextField label="IMAP host" value={imapHost} onChange={(e) => setImapHost(e.target.value)} mono />
              <TextField label="IMAP port" value={imapPort} onChange={(e) => setImapPort(e.target.value)} type="number" />
            </div>
          </div>
          <div className="settings-actions">
            <Button variant="outlined" onClick={() => testMut.mutate()} loading={testMut.isPending}>
              Test connection
            </Button>
            <Button icon={<IconCheck size={17} />} loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              Save
            </Button>
          </div>
        </Card>

        <Card className="settings-card">
          <div className="settings-head">
            <div className="domain-icon"><IconSettings size={20} /></div>
            <div>
              <h3>Appearance</h3>
              <p className="dim">Expressive glass in two flavors.</p>
            </div>
          </div>
          <Segmented<Theme>
            value={theme}
            onChange={(t) => (window as unknown as { __setTheme?: (t: Theme) => void }).__setTheme?.(t)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' }
            ]}
          />
        </Card>

        <Card className="settings-card settings-danger">
          <div className="settings-head">
            <div className="domain-icon danger-icon"><IconAlert size={20} /></div>
            <div>
              <h3>Stored secrets</h3>
              <p className="dim">
                The API key and every mailbox password are encrypted with Windows DPAPI, scoped to your Windows user.
                Clearing them signs the app out and forgets all saved mailbox passwords (inboxes of accounts created in
                the app can't be read again until you re-enter passwords).
              </p>
            </div>
          </div>
          <Button variant="danger" icon={<IconKey size={17} />} onClick={() => setClearOpen(true)}>
            Clear vault
          </Button>
        </Card>

        <p className="dim settings-foot">
          Email Handler — a mailcow admin companion. Bulk creation enforces uniqueness against live mailbox state;
          mail reading uses IMAPS with per-account credentials from the encrypted vault.
        </p>
      </div>

      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear the vault?"
        icon={<IconAlert size={20} />}
        actions={
          <>
            <Button variant="text" onClick={() => setClearOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={clearMut.isPending} onClick={() => { setClearOpen(false); clearMut.mutate() }}>
              Clear everything
            </Button>
          </>
        }
      >
        <p className="dim">
          This deletes the stored API key and all remembered mailbox passwords from this machine. Accounts on the
          server are untouched. You will be returned to the connection screen.
        </p>
      </Dialog>
    </div>
  )
}
