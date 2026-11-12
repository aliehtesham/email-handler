// ---------- Connection / auth ----------

export interface ConnectionStatus {
  configured: boolean
  serverUrl: string
  hasApiKey: boolean
  imapHost: string
  imapPort: number
}

export interface TestResult {
  ok: boolean
  error?: string
  version?: string
}

// ---------- Domains ----------

export interface Domain {
  domain_name: string
  description?: string
  aliases?: number
  max_aliases?: number
  mailboxes?: number
  max_mailboxes?: number
  def_quota_for_mbx?: number
  max_quota_for_mbx?: number
  quota_used?: number
  max_quota_for_domain?: number
  tags?: string[]
  active?: number | boolean
  created?: string
  modified?: string
  [key: string]: unknown
}

// ---------- Mailboxes ----------

export interface Mailbox {
  username: string
  local_part: string
  domain: string
  name?: string
  quota?: number
  quota_used?: number
  messages?: number
  active?: number | boolean
  tags?: string[]
  last_imap_login?: number
  created?: string
  modified?: string
  [key: string]: unknown
}

// ---------- Mail (via IMAP) ----------

export interface MailSummary {
  mailbox: string
  uid: number
  subject: string
  fromName: string
  fromAddress: string
  toAddress: string
  date: string
  seen: boolean
  size: number
}

export interface MailBody {
  text: string | null
  html: string | null
  attachments: string[]
}

export class IpcError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

// ---------- Bulk creation ----------

export type WildcardMode = 'count' | 'random'
export type PasswordMode = 'fixed' | 'random'

export interface CharsetOptions {
  digits: boolean
  lowercase: boolean
  uppercase: boolean
  symbols: boolean
  symbolSet: string
}

export interface BulkConfig {
  /** full pattern, e.g. "user*@devorev.com" — exactly one * in the local part */
  pattern: string
  wildcardMode: WildcardMode
  count: number
  /** count-up */
  start: number
  pad: number
  /** random wildcard */
  wildLength: number
  wildCharset: CharsetOptions
  passwordMode: PasswordMode
  fixedPassword: string
  randomPasswordLength: number
  randomPasswordCharset: CharsetOptions
  /** per-mailbox quota in MB */
  quotaMb: number
}

export interface BulkCreated {
  address: string
  password: string
}

export interface BulkFailed {
  address: string
  error: string
}

export interface BulkReport {
  created: BulkCreated[]
  failed: BulkFailed[]
  skipped: number
}

export interface BulkProgress {
  done: number
  total: number
  current: string
  created: number
  failed: number
  skipped: number
}

// ---------- API surface exposed to the renderer (window.api) ----------

export interface Api {
  // window controls
  windowMinimize(): void
  windowMaximize(): void
  windowClose(): void

  // settings / auth
  getStatus(): Promise<ConnectionStatus>
  saveConnection(serverUrl: string, apiKey: string, imapHost: string, imapPort: number): Promise<void>
  testConnection(serverUrl: string, apiKey: string): Promise<TestResult>
  clearSecrets(): Promise<void>

  // domains
  listDomains(): Promise<Domain[]>
  createDomain(attr: Record<string, unknown>): Promise<void>
  updateDomains(items: string[], attr: Record<string, unknown>): Promise<void>
  deleteDomains(items: string[]): Promise<void>

  // mailboxes
  listMailboxes(domain: string): Promise<Mailbox[]>
  createMailbox(attr: Record<string, unknown>): Promise<void>
  updateMailboxes(items: string[], attr: Record<string, unknown>): Promise<void>
  deleteMailboxes(items: string[]): Promise<void>
  setPassword(address: string, password: string): Promise<void>
  /** store a password for an externally-created account without touching the server */
  adoptPassword(address: string, password: string): Promise<void>
  hasPassword(address: string): Promise<boolean>

  // bulk
  bulkCreate(config: BulkConfig): Promise<BulkReport>
  onBulkProgress(cb: (p: BulkProgress) => void): () => void

  // mail
  listMail(addresses: string[], limit: number): Promise<MailSummary[]>
  getMailBody(address: string, uid: number): Promise<MailBody>

  // files
  saveTextFile(title: string, defaultName: string, content: string): Promise<string | null>

  // external links
  openExternal(url: string): Promise<void>
}
