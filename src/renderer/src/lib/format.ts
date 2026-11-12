export function fmtBytes(n?: number): string {
  if (!n || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

export function fmtQuotaMb(mb?: number): string {
  if (!mb || mb <= 0) return '—'
  return fmtBytes(mb * 1024 * 1024)
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.floor((+now - +d) / 86400000)
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

export function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function isActive(v: number | boolean | undefined): boolean {
  return v === 1 || v === true
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c] ?? '')).join(','))].join('\n')
}

export async function saveTextFile(title: string, defaultName: string, content: string): Promise<string | null> {
  return window.api.saveTextFile(title, defaultName, content)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
