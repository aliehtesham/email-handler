import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Fab, IconButton } from '../components/Button'
import { TextField, Switch } from '../components/fields'
import { Card, Chip, EmptyState, ProgressBar, SectionTitle, Spinner } from '../components/surfaces'
import { Dialog, Menu, MenuItem, useSnack } from '../components/overlays'
import {
  IconAlert,
  IconGlobe,
  IconMail,
  IconMore,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers
} from '../components/icons'
import { fmtBytes, fmtQuotaMb, isActive } from '../lib/format'
import type { Domain } from '@shared/types'
import './pages.css'

const emptyForm = {
  domain: '',
  description: '',
  max_mailboxes: 10,
  max_quota_for_mbx_mb: 1024,
  max_quota_for_domain_gb: 10,
  tags: '',
  active: true
}

export default function Domains() {
  const snack = useSnack()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({ queryKey: ['domains'], queryFn: () => window.api.listDomains() })
  const domains = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const [search, setSearch] = useState('')
  const filtered = domains.filter((d) => d.domain_name.toLowerCase().includes(search.toLowerCase()))

  // dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Domain | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [menu, setMenu] = useState<{ x: number; y: number; domain: string } | null>(null)

  const createMut = useMutation({
    mutationFn: () =>
      window.api.createDomain({
        domain: form.domain.trim().toLowerCase(),
        description: form.description.trim(),
        max_mailboxes: Number(form.max_mailboxes) || 10,
        max_quota_for_mbx: (Number(form.max_quota_for_mbx_mb) || 1024) * 1024 * 1024,
        max_quota_for_domain: (Number(form.max_quota_for_domain_gb) || 10) * 1024 * 1024 * 1024,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        active: form.active ? '1' : '0'
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      setCreateOpen(false)
      setForm(emptyForm)
      snack(`Domain ${form.domain} created`, 'success')
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  const editMut = useMutation({
    mutationFn: () =>
      window.api.updateDomains([editTarget!.domain_name], {
        description: form.description.trim(),
        max_mailboxes: Number(form.max_mailboxes) || 10,
        max_quota_for_mbx: (Number(form.max_quota_for_mbx_mb) || 1024) * 1024 * 1024,
        max_quota_for_domain: (Number(form.max_quota_for_domain_gb) || 10) * 1024 * 1024 * 1024,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        active: form.active ? '1' : '0'
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      setEditTarget(null)
      snack('Domain updated', 'success')
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  const deleteMut = useMutation({
    mutationFn: () => window.api.deleteDomains([deleteTarget!.domain_name]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      snack(`Domain ${deleteTarget?.domain_name} deleted`, 'success')
      setDeleteTarget(null)
      setConfirmText('')
    },
    onError: (e) => snack((e as Error).message, 'error')
  })

  const toggleActive = useMutation({
    mutationFn: (d: Domain) => window.api.updateDomains([d.domain_name], { active: isActive(d.active) ? '0' : '1' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domains'] }),
    onError: (e) => snack((e as Error).message, 'error')
  })

  function openEdit(d: Domain) {
    setForm({
      domain: d.domain_name,
      description: d.description ?? '',
      max_mailboxes: d.max_mailboxes ?? 10,
      max_quota_for_mbx_mb: Math.round((d.max_quota_for_mbx ?? 1024 * 1024 * 1024) / 1024 / 1024),
      max_quota_for_domain_gb: +(((d.max_quota_for_domain ?? 10 * 1024 ** 3) / 1024 ** 3).toFixed(2)),
      tags: (d.tags ?? []).join(', '),
      active: isActive(d.active)
    })
    setEditTarget(d)
  }

  const usagePct = (d: Domain) =>
    d.max_quota_for_domain && d.quota_used ? Math.min(100, (d.quota_used / d.max_quota_for_domain) * 100) : 0

  return (
    <div className="page-inner">
      <div className="page-head">
        <SectionTitle>Domains</SectionTitle>
        <div className="spacer" />
        <div className="search-pill">
          <IconSearch size={17} />
          <input placeholder="Search domains" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button icon={<IconPlus size={18} />} onClick={() => { setForm(emptyForm); setCreateOpen(true) }}>
          Add domain
        </Button>
      </div>

      <div className="scroll">
        {isLoading ? (
          <div className="center-spin"><Spinner size={30} /></div>
        ) : error ? (
          <EmptyState icon={<IconAlert size={34} />} title="Could not load domains" body={(error as Error).message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconGlobe size={34} />}
            title={search ? 'No domains match' : 'No domains yet'}
            body={search ? `Nothing matches “${search}”.` : 'Create your first domain to start managing mailboxes.'}
            action={<Button icon={<IconPlus size={18} />} onClick={() => { setForm(emptyForm); setCreateOpen(true) }}>Add domain</Button>}
          />
        ) : (
          <div className="domain-grid">
            {filtered.map((d, i) => (
              <motion.div
                key={d.domain_name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), type: 'spring', stiffness: 300, damping: 28 }}
              >
                <Card className="domain-card" onClick={() => navigate(`/domains/${d.domain_name}/mailboxes`)}>
                  <div className="domain-top">
                    <div className="domain-icon"><IconGlobe size={20} /></div>
                    <div className="domain-names">
                      <h3 className="truncate">{d.domain_name}</h3>
                      <span className="dim truncate">{d.description || 'No description'}</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        onClick={(e) => setMenu({ x: e.clientX, y: e.clientY, domain: d.domain_name })}
                        aria-label="Domain menu"
                      >
                        <IconMore size={18} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="domain-stats">
                    <div className="stat">
                      <IconUsers size={15} />
                      <span>{d.mailboxes ?? 0} / {d.max_mailboxes ?? '?'} mailboxes</span>
                    </div>
                    <div className="stat">
                      <IconMail size={15} />
                      <span>{fmtBytes(d.quota_used)} / {fmtBytes(d.max_quota_for_domain)}</span>
                    </div>
                  </div>

                  <ProgressBar value={usagePct(d)} />

                  <div className="domain-foot">
                    <div className="domain-tags">
                      {(d.tags ?? []).slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>
                    <div className="domain-active" onClick={(e) => e.stopPropagation()}>
                      <span className="label">{isActive(d.active) ? 'Active' : 'Disabled'}</span>
                      <Switch checked={isActive(d.active)} onChange={() => toggleActive.mutate(d)} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Fab
        className="page-fab"
        extended
        icon={<IconPlus size={22} />}
        label="New domain"
        onClick={() => { setForm(emptyForm); setCreateOpen(true) }}
      />

      <Menu open={!!menu} anchor={menu} onClose={() => setMenu(null)}>
        <MenuItem
          icon={<IconPencil size={17} />}
          onClick={() => {
            const d = domains.find((x) => x.domain_name === menu?.domain)
            if (d) openEdit(d)
            setMenu(null)
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          icon={<IconTrash size={17} />}
          danger
          onClick={() => {
            setDeleteTarget(domains.find((x) => x.domain_name === menu?.domain) ?? null)
            setConfirmText('')
            setMenu(null)
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* create / edit dialog */}
      <Dialog
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null) }}
        title={editTarget ? `Edit ${editTarget.domain_name}` : 'Add domain'}
        icon={<IconGlobe size={20} />}
        actions={
          <>
            <Button variant="text" onClick={() => { setCreateOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button
              loading={createMut.isPending || editMut.isPending}
              disabled={!editTarget && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(form.domain.trim())}
              onClick={() => (editTarget ? editMut.mutate() : createMut.mutate())}
            >
              {editTarget ? 'Save changes' : 'Create domain'}
            </Button>
          </>
        }
      >
        <TextField
          label="Domain"
          value={form.domain}
          disabled={!!editTarget}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          hint="example.com"
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="form-row">
          <TextField
            label="Max mailboxes"
            type="number"
            value={form.max_mailboxes}
            onChange={(e) => setForm({ ...form, max_mailboxes: Number(e.target.value) })}
          />
          <TextField
            label="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            hint="client, prod…"
          />
        </div>
        <div className="form-row">
          <TextField
            label="Mailbox quota (MB)"
            type="number"
            value={form.max_quota_for_mbx_mb}
            onChange={(e) => setForm({ ...form, max_quota_for_mbx_mb: Number(e.target.value) })}
          />
          <TextField
            label="Domain quota (GB)"
            type="number"
            value={form.max_quota_for_domain_gb}
            onChange={(e) => setForm({ ...form, max_quota_for_domain_gb: Number(e.target.value) })}
          />
        </div>
        <div className="form-inline">
          <span>Active</span>
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </Dialog>

      {/* delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.domain_name}?`}
        icon={<IconAlert size={20} />}
        actions={
          <>
            <Button variant="text" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={confirmText !== deleteTarget?.domain_name}
              loading={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <p className="dim">
          This removes <b>{deleteTarget?.domain_name}</b> and every mailbox on it from mailcow. Mail on disk will stop
          being delivered. Type the domain name to confirm:
        </p>
        <TextField label="Domain name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </Dialog>
    </div>
  )
}
