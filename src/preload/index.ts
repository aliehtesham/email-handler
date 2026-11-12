import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { Api, BulkProgress } from '../shared/types'

const api: Api = {
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  getStatus: () => ipcRenderer.invoke('settings:get'),
  saveConnection: (serverUrl, apiKey, imapHost, imapPort) =>
    ipcRenderer.invoke('auth:save', { serverUrl, apiKey, imapHost, imapPort }),
  testConnection: (serverUrl, apiKey) => ipcRenderer.invoke('auth:test', { serverUrl, apiKey }),
  clearSecrets: () => ipcRenderer.invoke('auth:clearSecrets'),

  listDomains: () => ipcRenderer.invoke('domains:list'),
  createDomain: (attr) => ipcRenderer.invoke('domains:create', attr),
  updateDomains: (items, attr) => ipcRenderer.invoke('domains:update', items, attr),
  deleteDomains: (items) => ipcRenderer.invoke('domains:delete', items),

  listMailboxes: (domain) => ipcRenderer.invoke('mailboxes:list', domain),
  createMailbox: (attr) => ipcRenderer.invoke('mailboxes:create', attr),
  updateMailboxes: (items, attr) => ipcRenderer.invoke('mailboxes:update', items, attr),
  deleteMailboxes: (items) => ipcRenderer.invoke('mailboxes:delete', items),
  setPassword: (address, password) => ipcRenderer.invoke('mailboxes:setPassword', address, password),
  adoptPassword: (address, password) => ipcRenderer.invoke('vault:adoptPassword', address, password),
  hasPassword: (address) => ipcRenderer.invoke('vault:hasPassword', address),

  bulkCreate: (config) => ipcRenderer.invoke('bulk:create', config),
  onBulkProgress: (cb) => {
    const handler = (_e: IpcRendererEvent, p: BulkProgress) => cb(p)
    ipcRenderer.on('bulk:progress', handler)
    return () => ipcRenderer.removeListener('bulk:progress', handler)
  },

  listMail: (addresses, limit) => ipcRenderer.invoke('mail:list', addresses, limit),
  getMailBody: (address, uid) => ipcRenderer.invoke('mail:body', address, uid),

  saveTextFile: (title, defaultName, content) =>
    ipcRenderer.invoke('files:saveText', { title, defaultName, content }),

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)
