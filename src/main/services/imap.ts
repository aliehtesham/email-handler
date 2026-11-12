import { ImapFlow } from 'imapflow'
import { simpleParser, ParsedMail } from 'mailparser'
import { getSettings } from './settings'
import { getPassword } from './vault'
import type { MailSummary, MailBody } from '@shared/types'

export const NO_PASSWORD = 'NO_PASSWORD'

function imapOptions(address: string) {
  const s = getSettings()
  return {
    host: s.imapHost,
    port: s.imapPort,
    secure: true,
    auth: { user: address, pass: getPassword(address) ?? '' },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    logger: false as const
  }
}

interface AddrObj {
  name?: string
  address?: string
}

function extractAddress(list: AddrObj[] | undefined): { name: string; address: string } {
  const first = list?.[0]
  return { name: first?.name ?? '', address: first?.address ?? '' }
}

async function withImap<T>(address: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  if (!getPassword(address)) throw new Error(NO_PASSWORD)
  const client = new ImapFlow(imapOptions(address))
  try {
    await client.connect()
    return await fn(client)
  } finally {
    try {
      await client.logout()
    } catch {
      try {
        client.close()
      } catch {
        /* already gone */
      }
    }
  }
}

/** last `limit` messages of INBOX, newest first */
export async function listMessages(address: string, limit: number): Promise<MailSummary[]> {
  return withImap(address, async (client) => {
    const lock = await client.getMailboxLock('INBOX')
    const out: MailSummary[] = []
    try {
      const mailbox = client.mailbox
      const exists = typeof mailbox === 'object' && mailbox !== null ? (mailbox as { exists: number }).exists : 0
      if (exists === 0) return []
      const range = `${Math.max(1, exists - limit + 1)}:*`
      for await (const msg of client.fetch(range, { uid: true, envelope: true, flags: true, size: true })) {
        const from = extractAddress(msg.envelope?.from)
        out.push({
          mailbox: address,
          uid: msg.uid,
          subject: msg.envelope?.subject ?? '(no subject)',
          fromName: from.name,
          fromAddress: from.address,
          toAddress: msg.envelope?.to?.[0]?.address ?? address,
          date: (msg.envelope?.date ?? new Date()).toISOString(),
          seen: (msg.flags ?? new Set<string>()).has('\\Seen'),
          size: msg.size ?? 0
        })
      }
    } finally {
      lock.release()
    }
    out.sort((a, b) => b.uid - a.uid)
    return out.slice(0, limit)
  })
}

export async function getBody(address: string, uid: number): Promise<MailBody> {
  return withImap(address, async (client) => {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const raw = await client.fetchOne(String(uid), { uid: true, source: true })
      if (!raw || !raw.source) throw new Error('Message not found.')
      const parsed: ParsedMail = await simpleParser(raw.source)
      const attachments = (parsed.attachments ?? []).map((a) => a.filename || 'unnamed')
      const html = parsed.html || parsed.textAsHtml || null
      return { text: parsed.text ?? null, html, attachments }
    } finally {
      lock.release()
    }
  })
}

const CONCURRENCY = 4

/** fetch mail for many accounts in parallel (bounded), merged newest-first */
export async function listMany(addresses: string[], limit: number): Promise<MailSummary[]> {
  const results: MailSummary[] = []
  const errors: unknown[] = []
  let idx = 0
  async function worker() {
    for (;;) {
      const i = idx++
      if (i >= addresses.length) return
      try {
        results.push(...(await listMessages(addresses[i], limit)))
      } catch (e) {
        // accounts without a stored password are simply silent in combined view
        errors.push(e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, addresses.length) }, worker))
  results.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  return results
}
