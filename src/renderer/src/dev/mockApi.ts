// Browser-preview mock of window.api — lets the UI be designed/tested in a
// plain browser (`?mock` query) without an Electron main process or a server.
import type { Api, MailSummary } from '@shared/types'

const DOMAINS = [
  { domain_name: 'devorev.com', description: 'Primary company domain', mailboxes: 12, max_mailboxes: 50, quota_used: 3.2 * 1024 ** 3, max_quota_for_domain: 10 * 1024 ** 3, max_quota_for_mbx: 2048 * 1024 ** 2, tags: ['primary', 'team'], active: 1, aliases: 4, max_aliases: 20 },
  { domain_name: 'devorev.net', description: 'Client projects', mailboxes: 6, max_mailboxes: 20, quota_used: 900 * 1024 ** 2, max_quota_for_domain: 5 * 1024 ** 3, max_quota_for_mbx: 1024 * 1024 ** 2, tags: ['clients'], active: 1, aliases: 2, max_aliases: 10 },
  { domain_name: 'mail.devorev.io', description: 'Transactional / system mail', mailboxes: 3, max_mailboxes: 10, quota_used: 0.4 * 1024 ** 3, max_quota_for_domain: 2 * 1024 ** 3, max_quota_for_mbx: 512 * 1024 ** 2, tags: ['system', 'noreply'], active: 1, aliases: 0, max_aliases: 5 },
  { domain_name: 'old.devorev.com', description: 'Legacy — migrating', mailboxes: 2, max_mailboxes: 8, quota_used: 1.1 * 1024 ** 3, max_quota_for_domain: 4 * 1024 ** 3, max_quota_for_mbx: 1024 * 1024 ** 2, tags: ['legacy'], active: 0, aliases: 1, max_aliases: 5 }
]

const NAMES: Array<[string, string]> = [
  ['alice', 'Alice Nguyen'], ['bruno', 'Bruno Costa'], ['chloe', 'Chloe Park'],
  ['david', 'David Okafor'], ['ela', 'Ela Yılmaz'], ['farid', 'Farid Haddad'],
  ['gia', 'Gia Rossi'], ['henk', 'Henk de Vries'], ['inno', 'Inno Support'], ['jobs', 'Job Applications']
]

function mailboxesFor(domain: string) {
  return NAMES.map(([local, name], i) => ({
    username: `${local}@${domain}`,
    local_part: local,
    domain,
    name,
    quota: 1024,
    quota_used: Math.round(Math.sin(i * 2.7) * 4e8 + 3e8),
    messages: Math.abs(Math.round(Math.cos(i * 1.3) * 40)) + 3,
    active: i === 8 ? 0 : 1,
    tags: [],
    last_imap_login: Math.floor(Date.now() / 1000) - i * 3600 * 5,
    created: '2025-03-02 10:00:00'
  }))
}

const SUBJECTS = [
  ['Welcome to the team 🎉', 'HR People Ops'],
  ['Your weekly analytics report', 'Metrics Bot'],
  ['Re: Invoice #2041 confirmation', 'Billing'],
  ['Design review — glass UI pass', 'Mila from Design'],
  ['Security alert: new sign-in', 'Accounts Google'],
  ['Lunch Friday?', 'Sara Bergström'],
  ['Shipping status: package delivered', 'Shop Express'],
  ['Newsletter — M3 Expressive deep dive', 'Material Digest']
]

function mailFor(address: string): MailSummary[] {
  const n = 7 + (address.length % 3)
  return Array.from({ length: n }, (_, i) => {
    const [subject, sender] = SUBJECTS[(address.length + i) % SUBJECTS.length]
    const slug = sender.toLowerCase().replace(/[^a-z]+/g, '.') + '@mail.devorev.com'
    return {
      mailbox: address,
      uid: 100 - i,
      subject,
      fromName: sender,
      fromAddress: slug,
      toAddress: address,
      date: new Date(Date.now() - i * 3.7e8 - 6e6).toISOString(),
      seen: i > 1,
      size: 2_400 + i * 3_100
    }
  })
}

const BODY_HTML = `
<div style="font-family:inherit;line-height:1.65">
  <p>Hi there,</p>
  <p>Quick heads-up that the <b>glass UI pass</b> is ready for review. The tokens now derive from a
  single seed color, and the expressive shapes animate on press. A few notes:</p>
  <ul>
    <li>Surfaces use 28px blur with 150% saturation</li>
    <li>Buttons morph from pill to 18px radius while pressed</li>
    <li>Lists stagger in with emphasized easing</li>
  </ul>
  <p>See the <a href="https://example.com/preview">preview board</a> for the full mockups.</p>
  <p>Let me know how it feels — happy to push the color further.</p>
  <p style="margin-top:24px">Best,<br/>Mila</p>
</div>`

const api: Api = {
  windowMinimize: () => {},
  windowMaximize: () => {},
  windowClose: () => {},

  getStatus: async () => ({ configured: true, serverUrl: 'https://mail.devorev.com', hasApiKey: true, imapHost: 'mail.devorev.com', imapPort: 993 }),
  saveConnection: async () => {},
  testConnection: async () => ({ ok: true, version: 'mock 2026-01' }),
  clearSecrets: async () => {},

  listDomains: async () => DOMAINS,
  createDomain: async () => {},
  updateDomains: async () => {},
  deleteDomains: async () => {},

  listMailboxes: async (domain: string) => mailboxesFor(domain),
  createMailbox: async () => {},
  updateMailboxes: async () => {},
  deleteMailboxes: async () => {},
  setPassword: async () => {},
  adoptPassword: async () => {},
  hasPassword: async () => true,

  bulkCreate: async () => ({ created: [], failed: [], skipped: 0 }),
  onBulkProgress: () => () => {},

  listMail: async (addresses: string[]) => addresses.flatMap((a) => mailFor(a)).sort((x, y) => +new Date(y.date) - +new Date(x.date)),
  getMailBody: async () => ({ text: 'Plain text fallback body.', html: BODY_HTML, attachments: ['brief.pdf', 'tokens.fig'] }),

  saveTextFile: async () => null,

  openExternal: async (url: string) => {
    ;(window as unknown as { __opened?: string[] }).__opened = [...((window as unknown as { __opened?: string[] }).__opened ?? []), url]
  }
}

;(window as unknown as { api: Api }).api = api
