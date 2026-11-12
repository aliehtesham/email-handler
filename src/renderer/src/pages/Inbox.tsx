import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Button, IconButton } from '../components/Button'
import { PasswordReveal, Switch, TextField } from '../components/fields'
import { Avatar, Card, Chip, EmptyState, Spinner } from '../components/surfaces'
import { useSnack } from '../components/overlays'
import {
  IconAlert,
  IconArrowLeft,
  IconClock,
  IconInbox,
  IconKey,
  IconMail,
  IconPaperclip,
  IconRefresh,
  IconUsers
} from '../components/icons'
import { fmtBytes, fmtDate, fmtFullDate } from '../lib/format'
import type { MailSummary } from '@shared/types'
import './pages.css'

const PAGE_SIZE = 50

/**
 * Inbox for one account (single) or a merged view across many (combined).
 * In combined mode rows carry an account chip and passwordless accounts
 * are silently skipped by the backend.
 */
export default function Inbox({ single = false, combined = false }: { single?: boolean; combined?: boolean }) {
  const { domain = '', address = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const snack = useSnack()
  const qc = useQueryClient()

  const addresses = useMemo(() => {
    if (single) return [decodeURIComponent(address)]
    const raw = params.get('addresses') ?? ''
    return raw.split(',').map(decodeURIComponent).filter(Boolean)
  }, [single, address, params])

  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('autoRefresh') === '1')
  useEffect(() => {
    localStorage.setItem('autoRefresh', autoRefresh ? '1' : '0')
  }, [autoRefresh])

  const [selected, setSelected] = useState<MailSummary | null>(null)

  const mailQuery = useQuery({
    queryKey: ['mail', addresses.join(',')],
    queryFn: () => window.api.listMail(addresses, PAGE_SIZE),
    refetchInterval: autoRefresh ? 30_000 : false,
    enabled: addresses.length > 0
  })

  const needsPassword = single && mailQuery.error && String((mailQuery.error as Error).message).includes('NO_PASSWORD')

  // reset reader when switching accounts/pages
  useEffect(() => setSelected(null), [addresses.join(',')])

  const title = single
    ? decodeURIComponent(address)
    : `${addresses.length} accounts — combined inbox`

  return (
    <div className="page-inner">
      <div className="page-head">
        {single ? (
          <IconButton onClick={() => navigate(`/domains/${encodeURIComponent(domain)}/mailboxes`)} aria-label="Back">
            <IconArrowLeft />
          </IconButton>
        ) : (
          <IconButton onClick={() => window.history.back()} aria-label="Back">
            <IconArrowLeft />
          </IconButton>
        )}
        {single ? (
          <Avatar name={addresses[0]} size={44} />
        ) : (
          <div className="domain-icon"><IconUsers size={22} /></div>
        )}
        <div className="head-titles">
          <h1 className="truncate mono">{title}</h1>
          <span className="dim">
            {mailQuery.data ? `${mailQuery.data.length} messages` : 'Loading…'}
            {combined ? ' · newest first across all selected accounts' : ' · INBOX'}
          </span>
        </div>
        <div className="spacer" />
        <div className="auto-refresh">
          <span className="label">AUTO 30s</span>
          <Switch checked={autoRefresh} onChange={setAutoRefresh} />
        </div>
        <IconButton
          aria-label="Refresh"
          title="Refresh"
          onClick={() => mailQuery.refetch()}
          className={mailQuery.isFetching ? 'spin' : ''}
        >
          <IconRefresh />
        </IconButton>
      </div>

      {needsPassword ? (
        <AdoptPanel address={addresses[0]} onAdopted={() => qc.invalidateQueries({ queryKey: ['mail'] })} />
      ) : (
        <div className="mail-layout">
          <Card className="mail-list-pane">
            <div className="mail-list-scroll">
              {mailQuery.isLoading ? (
                <div className="center-spin"><Spinner size={28} /></div>
              ) : mailQuery.error ? (
                <EmptyState
                  icon={<IconAlert size={32} />}
                  title="Could not load mail"
                  body={(mailQuery.error as Error).message}
                  action={<Button variant="outlined" onClick={() => mailQuery.refetch()}>Retry</Button>}
                />
              ) : (mailQuery.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<IconInbox size={32} />}
                  title="No mail yet"
                  body={
                    single
                      ? 'Nothing has arrived in this inbox. Send a message to this address and hit refresh.'
                      : 'None of the selected accounts has mail (accounts without a stored password are skipped here — open them individually to unlock).'
                  }
                />
              ) : (
                mailQuery.data!.map((m) => (
                  <MailRow
                    key={`${m.mailbox}-${m.uid}`}
                    mail={m}
                    active={selected?.mailbox === m.mailbox && selected?.uid === m.uid}
                    showAccount={combined}
                    onClick={() => setSelected(m)}
                  />
                ))
              )}
            </div>
          </Card>

          <Reader mail={selected} />
        </div>
      )}
    </div>
  )
}

function MailRow({
  mail,
  active,
  showAccount,
  onClick
}: {
  mail: MailSummary
  active: boolean
  showAccount: boolean
  onClick: () => void
}) {
  return (
    <div className={`mail-row state-layer ${active ? 'mail-row-active' : ''}`} onClick={onClick}>
      <div className={`mail-dot ${mail.seen ? 'read' : 'unread'}`} />
      <div className="mail-row-main">
        <div className="mail-row-top">
          <span className={`truncate ${mail.seen ? 'dim' : 'strong'}`}>
            {mail.fromName || mail.fromAddress || '(unknown sender)'}
          </span>
          <span className="mail-date dim">{fmtDate(mail.date)}</span>
        </div>
        <div className={`mail-subject truncate ${mail.seen ? '' : 'strong'}`}>{mail.subject}</div>
        <div className="mail-row-bottom dim">
          {showAccount && <Chip tone="primary">{mail.mailbox}</Chip>}
          <span className="truncate">{mail.toAddress}</span>
          <span className="mail-size">{fmtBytes(mail.size)}</span>
        </div>
      </div>
    </div>
  )
}

function Reader({ mail }: { mail: MailSummary | null }) {
  const bodyQuery = useQuery({
    queryKey: ['mailbody', mail?.mailbox, mail?.uid],
    queryFn: () => window.api.getMailBody(mail!.mailbox, mail!.uid),
    enabled: !!mail
  })

  if (!mail) {
    return (
      <Card className="mail-reader-pane">
        <EmptyState icon={<IconMail size={34} />} title="Select a message" body="Pick any message on the left to read it here." />
      </Card>
    )
  }

  const html = bodyQuery.data?.html
    ? sanitize(bodyQuery.data.html)
    : null

  return (
    <Card className="mail-reader-pane">
      <div className="reader-head">
        <h2 className="truncate">{mail.subject}</h2>
        <div className="reader-meta dim">
          <span><b>{mail.fromName || mail.fromAddress}</b> {mail.fromName ? `<${mail.fromAddress}>` : ''}</span>
          <span>to {mail.toAddress}</span>
          <span><IconClock size={13} /> {fmtFullDate(mail.date)}</span>
          {mail.mailbox !== mail.toAddress && <Chip tone="primary">{mail.mailbox}</Chip>}
        </div>
        {bodyQuery.data && bodyQuery.data.attachments.length > 0 && (
          <div className="reader-attachments">
            <IconPaperclip size={15} />
            {bodyQuery.data.attachments.map((a) => <Chip key={a}>{a}</Chip>)}
          </div>
        )}
      </div>
      <div className="reader-body">
        {bodyQuery.isLoading ? (
          <div className="center-spin"><Spinner /></div>
        ) : bodyQuery.error ? (
          <EmptyState icon={<IconAlert size={30} />} title="Could not load message" body={(bodyQuery.error as Error).message} />
        ) : html ? (
          <div className="mail-html" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="mail-text">{bodyQuery.data?.text || '(empty message)'}</pre>
        )}
      </div>
    </Card>
  )
}

/** strip scripts and global styles; mail HTML is untrusted input */
function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'script', 'iframe', 'form'] })
}

/** mail links never navigate the app — http(s)/mailto open in the system browser */
function onBodyClick(e: MouseEvent<HTMLDivElement>) {
  const anchor = (e.target as HTMLElement).closest('a')
  if (!anchor) return
  e.preventDefault()
  const href = anchor.getAttribute('href') ?? ''
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    void window.api.openExternal(href)
  }
}

function AdoptPanel({ address, onAdopted }: { address: string; onAdopted: () => void }) {
  const snack = useSnack()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)

  const mut = useMutation({
    mutationFn: () => window.api.adoptPassword(address, pw),
    onSuccess: () => {
      snack(`Password saved for ${address} — loading inbox…`, 'success')
      setPw('')
      onAdopted()
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  return (
    <Card className="adopt-panel">
      <div className="adopt-icon"><IconKey size={26} /></div>
      <div className="adopt-text">
        <h3>Enter the password for this inbox</h3>
        <p className="dim">
          <span className="mono">{address}</span> was created outside the app (or its password was changed elsewhere).
          Enter its current password once — the app stores it encrypted and can read this inbox from then on. You can
          also reset the password from the accounts list.
        </p>
      </div>
      <div className="adopt-form">
        <TextField
          label="Current password"
          type={show ? 'text' : 'password'}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          suffix={PasswordReveal(show, () => setShow(!show))}
          className="adopt-input"
        />
        <Button icon={<IconKey size={17} />} disabled={pw.length < 1} loading={mut.isPending} onClick={() => mut.mutate()}>
          Unlock inbox
        </Button>
      </div>
    </Card>
  )
}
