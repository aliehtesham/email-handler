import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { writeFile } from 'fs/promises'
import { getSettings, updateSettings, deriveImapHost, SettingsShape } from './services/settings'
import * as vault from './services/vault'
import * as mailcow from './services/mailcow'
import * as imap from './services/imap'
import { runBulkCreate } from './services/bulk'
import type { BulkConfig } from '@shared/types'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  // ---- window controls ----
  ipcMain.on('window:minimize', () => getWindow()?.minimize())
  ipcMain.on('window:maximize', () => {
    const w = getWindow()
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.on('window:close', () => getWindow()?.close())

  // ---- settings / auth ----
  ipcMain.handle('settings:get', () => {
    const s = getSettings()
    const key = vault.getApiKey()
    return {
      configured: Boolean(s.serverUrl && key),
      serverUrl: s.serverUrl,
      hasApiKey: Boolean(key),
      imapHost: s.imapHost,
      imapPort: s.imapPort
    }
  })

  ipcMain.handle(
    'auth:save',
    (_e, payload: { serverUrl: string; apiKey?: string; imapHost?: string; imapPort?: number }) => {
      const host = payload.imapHost?.trim() || deriveImapHost(payload.serverUrl)
      updateSettings({
        serverUrl: payload.serverUrl.trim().replace(/\/+$/, ''),
        imapHost: host,
        imapPort: payload.imapPort ?? 993
      })
      if (payload.apiKey && payload.apiKey.trim()) vault.setApiKey(payload.apiKey.trim())
    }
  )

  ipcMain.handle('auth:test', async (_e, payload: { serverUrl: string; apiKey: string }) => {
    const base = payload.serverUrl.trim().replace(/\/+$/, '')
    try {
      const res = await fetch(`${base}/api/v1/get/status/version`, {
        headers: { 'X-API-Key': payload.apiKey.trim() }
      })
      if (res.status === 401)
        return {
          ok: false,
          error:
            'Unauthorized — the server rejected this key. Create a read-write key in mailcow: System → Configuration → Access → Administrators → API card.'
        }
      if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${res.statusText}` }
      const text = await res.text()
      let version = ''
      try {
        const j = JSON.parse(text)
        version = typeof j === 'string' ? j : String(j.version ?? '')
      } catch {
        version = text.trim()
      }
      return { ok: true, version }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('auth:clearSecrets', () => vault.clearSecrets())

  // ---- domains ----
  ipcMain.handle('domains:list', () => mailcow.get('/get/domain/all'))
  ipcMain.handle('domains:create', (_e, attr: Record<string, unknown>) =>
    mailcow.post('/add/domain', attr).then((r) => mailcow.assertWriteOk(r, 'Failed to create domain.'))
  )
  ipcMain.handle('domains:update', (_e, items: string[], attr: Record<string, unknown>) =>
    mailcow.post('/edit/domain', { items, attr }).then((r) => mailcow.assertWriteOk(r, 'Failed to update domain.'))
  )
  ipcMain.handle('domains:delete', (_e, items: string[]) =>
    mailcow.post('/delete/domain', items).then((r) => mailcow.assertWriteOk(r, 'Failed to delete domain.'))
  )

  // ---- mailboxes ----
  ipcMain.handle('mailboxes:list', (_e, domain: string) =>
    mailcow.get(`/get/mailbox/all/${encodeURIComponent(domain)}`)
  )
  ipcMain.handle('mailboxes:create', (_e, attr: Record<string, unknown>) =>
    mailcow.post('/add/mailbox', attr).then((r) => mailcow.assertWriteOk(r, 'Failed to create mailbox.'))
  )
  ipcMain.handle('mailboxes:update', (_e, items: string[], attr: Record<string, unknown>) =>
    mailcow.post('/edit/mailbox', { items, attr }).then((r) => mailcow.assertWriteOk(r, 'Failed to update mailbox.'))
  )
  ipcMain.handle('mailboxes:delete', (_e, items: string[]) =>
    mailcow.post('/delete/mailbox', items).then((r) => mailcow.assertWriteOk(r, 'Failed to delete mailbox.'))
  )

  ipcMain.handle('mailboxes:setPassword', async (_e, address: string, password: string) => {
    await mailcow
      .post('/edit/mailbox', { items: [address], attr: { password, password2: password } })
      .then((r) => mailcow.assertWriteOk(r, 'Failed to set password.'))
    vault.setPassword(address, password)
  })

  ipcMain.handle('vault:hasPassword', (_e, address: string) => Boolean(vault.getPassword(address)))

  ipcMain.handle('vault:adoptPassword', (_e, address: string, password: string) => {
    vault.setPassword(address, password)
  })

  // ---- bulk ----
  ipcMain.handle('bulk:create', (e, cfg: BulkConfig) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return runBulkCreate(cfg, (p) => win?.webContents.send('bulk:progress', p))
  })

  // ---- mail ----
  ipcMain.handle('mail:list', (_e, addresses: string[], limit: number) =>
    // single account: let NO_PASSWORD surface so the UI can offer the adopt form
    addresses.length === 1 ? imap.listMessages(addresses[0], limit) : imap.listMany(addresses, limit)
  )
  ipcMain.handle('mail:body', (_e, address: string, uid: number) => imap.getBody(address, uid))

  // ---- external links (mail body buttons/links) ----
  const SAFE_URL = /^(https?:\/\/|mailto:)/i
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (typeof url !== 'string' || url.length > 2048 || !SAFE_URL.test(url)) {
      throw new Error('Blocked non-http(s)/mailto link.')
    }
    return shell.openExternal(url)
  })

  // ---- files ----
  ipcMain.handle(
    'files:saveText',
    async (_e, payload: { title: string; defaultName: string; content: string }) => {
      const win = getWindow()
      if (!win) return null
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: payload.title,
        defaultPath: payload.defaultName
      })
      if (canceled || !filePath) return null
      await writeFile(filePath, payload.content, 'utf-8')
      return filePath
    }
  )
}

export type { SettingsShape }
