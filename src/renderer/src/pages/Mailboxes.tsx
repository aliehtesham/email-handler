import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Fab, IconButton } from '../components/Button'
import { Checkbox, PasswordReveal, TextField } from '../components/fields'
import { Avatar, Card, Chip, EmptyState, Spinner } from '../components/surfaces'
import { Dialog, Menu, MenuItem, useSnack } from '../components/overlays'
import {
  IconAlert,
  IconArrowLeft,
  IconInbox,
  IconKey,
  IconMail,
  IconMore,
  IconPencil,
  IconPlus,
  IconSearch,
  IconStacks,
  IconTrash,
  IconUsers,
  IconWand
} from '../components/icons'
import { copyText, fmtBytes, fmtDate, fmtQuotaMb, isActive } from '../lib/format'
import BulkCreateDialog from './BulkCreateDialog'
import type { Mailbox } from '@shared/types'
import './pages.css'

const DEFAULT_SYMBOLS = '!@#$%^&*_-+='

export default function Mailboxes() {
  const { domain = '' } = useParams()
  const snack = useSnack()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['mailboxes', domain],
    queryFn: () => window.api.listMailboxes(domain)
  })
  const mailboxes = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const [search, setSearch] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Mailbox | null>(null)
  const [pwTarget, setPwTarget] = useState<Mailbox | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; user: string } | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const filtered = mailboxes.filter(
    (m) =>
      m.username.toLowerCase().includes(search.toLowerCase()) ||
      (m.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(address: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(address)) next.delete(address)
      else next.add(address)
      return next
    })
  }

  function rowClick(m: Mailbox) {
    if (selectMode) toggleSelect(m.username)
    else navigate(`/domains/${encodeURIComponent(domain)}/mailbox/${encodeURIComponent(m.username)}`)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['mailboxes', domain] })

  const deleteMut = useMutation({
    mutationFn: () => window.api.deleteMailboxes(deleteTargets!),
    onSuccess: () => {
      snack(`Deleted ${deleteTargets?.length} account${deleteTargets?.length === 1 ? '' : 's'}`, 'success')
      setSelected(new Set())
      setDeleteTargets(null)
      setConfirmText('')
      invalidate()
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  return (
    <div className="page-inner">
      <div className="page-head">
        <IconButton onClick={() => navigate('/domains')} aria-label="Back">
          <IconArrowLeft />
        </IconButton>
        <div className="head-titles">
          <h1 className="truncate">{domain}</h1>
          <span className="dim">{mailboxes.length} accounts</span>
        </div>
        <div className="spacer" />
        <div className="search-pill">
          <IconSearch size={17} />
          <input placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant={selectMode ? 'filled' : 'outlined'} icon={<IconStacks size={17} />} onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}>
          Select
        </Button>
        <Button
          variant="tonal"
          icon={<IconPlus size={17} />}
          onClick={() => setCreateOpen(true)}
        >
          Add account
        </Button>
      </div>

      <div className="scroll">
        {isLoading ? (
          <div className="center-spin"><Spinner size={30} /></div>
        ) : error ? (
          <EmptyState icon={<IconAlert size={34} />} title="Could not load accounts" body={(error as Error).message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconUsers size={34} />}
            title={search ? 'No accounts match' : 'No accounts yet'}
            body={search ? `Nothing matches “${search}”.` : 'Create accounts one by one, or generate a whole pattern batch.'}
            action={
              <div className="empty-actions">
                <Button variant="outlined" icon={<IconPlus size={17} />} onClick={() => setCreateOpen(true)}>Add account</Button>
                <Button icon={<IconWand size={17} />} onClick={() => setBulkOpen(true)}>Bulk create</Button>
              </div>
            }
          />
        ) : (
          <div className="mailbox-list">
            {filtered.map((m, i) => {
              const isSelected = selected.has(m.username)
              return (
                <motion.div
                  key={m.username}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25), type: 'spring', stiffness: 320, damping: 30 }}
                >
                  <Card className={`mailbox-row ${isSelected ? 'mailbox-selected' : ''}`} onClick={() => rowClick(m)}>
                    {selectMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(m.username)} />
                      </div>
                    )}
                    <Avatar name={m.name || m.local_part} />
                    <div className="mailbox-main">
                      <div className="mailbox-line1">
                        <span className="mono truncate">{m.username}</span>
                        {!isActive(m.active) && <Chip tone="error">disabled</Chip>}
                      </div>
                      <div className="mailbox-line2 dim">
                        {m.name && <span className="truncate">{m.name} · </span>}
                        <span>{m.messages ?? 0} msgs · {fmtBytes(m.quota_used)} / {fmtQuotaMb(m.quota)}</span>
                        {m.last_imap_login ? <span> · last login {fmtDate(new Date(m.last_imap_login * 1000).toISOString())}</span> : null}
                      </div>
                    </div>
                    <div className="mailbox-actions" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        aria-label="Open inbox"
                        title="Open inbox"
                        onClick={() => navigate(`/domains/${encodeURIComponent(domain)}/mailbox/${encodeURIComponent(m.username)}`)}
                      >
                        <IconInbox size={18} />
                      </IconButton>
                      <IconButton
                        aria-label="Account menu"
                        title="More"
                        onClick={(e) => setMenu({ x: e.clientX, y: e.clientY, user: m.username })}
                      >
                        <IconMore size={18} />
                      </IconButton>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* floating selection bar */}
      {selectMode && selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 26, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
          <div className="selection-bar glass-strong">
            <b>{selected.size} selected</b>
            <Button
              icon={<IconInbox size={17} />}
              onClick={() => navigate(`/combined?addresses=${encodeURIComponent([...selected].join(','))}`)}
            >
              Combined inbox
            </Button>
            <Button
              variant="danger"
              icon={<IconTrash size={16} />}
              onClick={() => { setDeleteTargets([...selected]); setConfirmText('') }}
            >
              Delete
            </Button>
            <IconButton aria-label="Clear selection" onClick={() => setSelected(new Set())}>
              ✕
            </IconButton>
          </div>
        </motion.div>
      )}

      <Fab className="page-fab" extended icon={<IconWand size={22} />} label="Bulk create" onClick={() => setBulkOpen(true)} />

      <Menu open={!!menu} anchor={menu} onClose={() => setMenu(null)}>
        <MenuItem icon={<IconPencil size={17} />} onClick={() => { setEditTarget(mailboxes.find((m) => m.username === menu?.user) ?? null); setMenu(null) }}>
          Edit account
        </MenuItem>
        <MenuItem icon={<IconKey size={17} />} onClick={() => { setPwTarget(mailboxes.find((m) => m.username === menu?.user) ?? null); setMenu(null) }}>
          Set / reset password
        </MenuItem>
        <MenuItem icon={<IconTrash size={17} />} danger onClick={() => { setDeleteTargets(menu ? [menu.user] : null); setConfirmText(''); setMenu(null) }}>
          Delete
        </MenuItem>
      </Menu>

      {/* single account create */}
      <CreateAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} domain={domain} onDone={invalidate} />

      <BulkCreateDialog open={bulkOpen} onClose={() => setBulkOpen(false)} domain={domain} existing={mailboxes} />

      {/* edit dialog */}
      <EditMailboxDialog target={editTarget} onClose={() => setEditTarget(null)} onDone={invalidate} />

      {/* password dialog */}
      <PasswordDialog target={pwTarget} onClose={() => setPwTarget(null)} />

      {/* delete confirm */}
      <Dialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        title={deleteTargets && deleteTargets.length > 1 ? `Delete ${deleteTargets.length} accounts?` : `Delete ${deleteTargets?.[0] ?? ''}?`}
        icon={<IconAlert size={20} />}
        actions={
          <>
            <Button variant="text" onClick={() => setDeleteTargets(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!deleteTargets || (deleteTargets.length === 1 && confirmText !== deleteTargets[0])}
              loading={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="dim">
          {deleteTargets && deleteTargets.length > 1 ? (
            <>These {deleteTargets.length} mailboxes and all their mail will be removed from mailcow.</>
          ) : (
            <>The mailbox and all its mail will be removed from mailcow. Type the full address to confirm.</>
          )}
        </p>
        {deleteTargets && deleteTargets.length === 1 && (
          <TextField label="Email address" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        )}
      </Dialog>
    </div>
  )
}

// ---------- dialogs ----------

function CreateAccountDialog({
  open,
  onClose,
  domain,
  onDone
}: {
  open: boolean
  onClose: () => void
  domain: string
  onDone: () => void
}) {
  const snack = useSnack()
  const [localPart, setLocalPart] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [quotaMb, setQuotaMb] = useState(1024)
  const [active, setActive] = useState(true)

  const mut = useMutation({
    mutationFn: () =>
      window.api.createMailbox({
        local_part: localPart.trim().toLowerCase(),
        domain,
        name: name.trim(),
        password,
        password2: password,
        quota: quotaMb,
        active: active ? 1 : 0
      }),
    onSuccess: () => {
      snack(`${localPart}@${domain} created`, 'success')
      onDone()
      setLocalPart('')
      setName('')
      setPassword('')
      onClose()
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  const valid = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(localPart.trim()) && password.length >= 8

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add account"
      icon={<IconMail size={20} />}
      actions={
        <>
          <Button variant="text" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid}
            loading={mut.isPending}
            onClick={() => mut.mutate()}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="form-row">
        <TextField label="Local part" value={localPart} onChange={(e) => setLocalPart(e.target.value)} mono hint={`@${domain}`} />
        <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <TextField
        label="Password"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        suffix={
          <>
            <IconButton aria-label="Generate" title="Generate strong password" onClick={() => { setPassword(genPassword()); setShowPw(true) }}>
              <IconWand size={17} />
            </IconButton>
            {PasswordReveal(showPw, () => setShowPw(!showPw))}
          </>
        }
      />
      <div className="form-row">
        <TextField label="Quota (MB)" type="number" value={quotaMb} onChange={(e) => setQuotaMb(Number(e.target.value))} />
        <div className="form-inline">
          <span>Active</span>
          <Checkbox checked={active} onChange={setActive} label={active ? 'Yes' : 'No'} />
        </div>
      </div>
    </Dialog>
  )
}

function genPassword(): string {
  // small local generator for the single-create dialog
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' + DEFAULT_SYMBOLS
  const arr = new Uint32Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => charset[n % charset.length]).join('')
}

function EditMailboxDialog({
  target,
  onClose,
  onDone
}: {
  target: Mailbox | null
  onClose: () => void
  onDone: () => void
}) {
  const snack = useSnack()
  const [name, setName] = useState('')
  const [quotaMb, setQuotaMb] = useState(1024)
  const [active, setActive] = useState(true)

  // sync form when a new target is opened
  const [lastUser, setLastUser] = useState<string | null>(null)
  if (target && target.username !== lastUser) {
    setLastUser(target.username)
    setName(target.name ?? '')
    setQuotaMb(Math.max(1, Math.round((target.quota ?? 1024))))
    setActive(isActive(target.active))
  }
  if (!target && lastUser) setLastUser(null)

  const mut = useMutation({
    mutationFn: () => window.api.updateMailboxes([target!.username], { name: name.trim(), quota: quotaMb, active: active ? 1 : 0 }),
    onSuccess: () => {
      snack('Account updated', 'success')
      onDone()
      onClose()
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Edit ${target?.username ?? ''}`}
      icon={<IconPencil size={20} />}
      actions={
        <>
          <Button variant="text" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate()}>Save</Button>
        </>
      }
    >
      <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="form-row">
        <TextField label="Quota (MB)" type="number" value={quotaMb} onChange={(e) => setQuotaMb(Number(e.target.value))} />
        <div className="form-inline">
          <span>Active</span>
          <Checkbox checked={active} onChange={setActive} label={active ? 'Yes' : 'No'} />
        </div>
      </div>
    </Dialog>
  )
}

function PasswordDialog({ target, onClose }: { target: Mailbox | null; onClose: () => void }) {
  const snack = useSnack()
  const qc = useQueryClient()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)

  const mut = useMutation({
    mutationFn: () => window.api.setPassword(target!.username, pw),
    onSuccess: () => {
      snack(`Password changed for ${target?.username} — the app can still read this inbox.`, 'success')
      qc.invalidateQueries({ queryKey: ['mailboxes'] })
      setPw('')
      onClose()
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Password for ${target?.username ?? ''}`}
      icon={<IconKey size={20} />}
      actions={
        <>
          <Button variant="text" onClick={onClose}>Cancel</Button>
          <Button disabled={pw.length < 8} loading={mut.isPending} onClick={() => mut.mutate()}>
            Change password
          </Button>
        </>
      }
    >
      <p className="dim">
        This changes the real password on mailcow and saves it (encrypted) so the app can keep reading this inbox.
      </p>
      <TextField
        label="New password"
        type={show ? 'text' : 'password'}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        suffix={
          <>
            <IconButton aria-label="Generate" title="Generate strong password" onClick={() => { setPw(genPassword()); setShow(true) }}>
              <IconWand size={17} />
            </IconButton>
            {PasswordReveal(show, () => setShow(!show))}
          </>
        }
      />
      <Button
        variant="text"
        icon={<IconKey size={16} />}
        onClick={async () => {
          const ok = await copyText(pw)
          snack(ok ? 'Copied' : 'Nothing to copy', ok ? 'success' : 'error')
        }}
      >
        Copy password
      </Button>
    </Dialog>
  )
}
