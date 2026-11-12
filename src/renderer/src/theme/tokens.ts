import { argbFromHex, hexFromArgb, themeFromSourceColor, Scheme, Theme, argbFromRgb } from '@material/material-color-utilities'

/** expressive violet seed — drives the whole tonal system */
export const SEED = '#7C6CF6'

let cached: Theme | null = null
function getTheme(): Theme {
  if (!cached) cached = themeFromSourceColor(argbFromHex(SEED))
  return cached
}

const ROLE_VARS: Array<[string, keyof Scheme]> = [
  ['primary', 'primary'],
  ['on-primary', 'onPrimary'],
  ['primary-container', 'primaryContainer'],
  ['on-primary-container', 'onPrimaryContainer'],
  ['secondary', 'secondary'],
  ['on-secondary', 'onSecondary'],
  ['secondary-container', 'secondaryContainer'],
  ['on-secondary-container', 'onSecondaryContainer'],
  ['tertiary', 'tertiary'],
  ['on-tertiary', 'onTertiary'],
  ['tertiary-container', 'tertiaryContainer'],
  ['on-tertiary-container', 'onTertiaryContainer'],
  ['error', 'error'],
  ['on-error', 'onError'],
  ['error-container', 'errorContainer'],
  ['on-error-container', 'onErrorContainer'],
  ['surface', 'surface'],
  ['on-surface', 'onSurface'],
  ['surface-variant', 'surfaceVariant'],
  ['on-surface-variant', 'onSurfaceVariant'],
  ['outline', 'outline'],
  ['outline-variant', 'outlineVariant'],
  ['inverse-surface', 'inverseSurface'],
  ['inverse-on-surface', 'inverseOnSurface'],
  ['inverse-primary', 'inversePrimary']
]

function mixHex(a: string, b: string, t: number): string {
  const ca = argbFromHex(a)
  const cb = argbFromHex(b)
  const ch = (v: number, shift: number) => (v >> shift) & 0xff
  const mixCh = (shift: number) => Math.round(ch(ca, shift) * (1 - t) + ch(cb, shift) * t)
  return hexFromArgb(argbFromRgb(mixCh(16), mixCh(8), mixCh(0)))
}

/** the installed MCU build lacks the surface-container tiers — derive them toward white/black */
function derivedRoles(scheme: Scheme): Array<[string, string]> {
  const surface = hexFromArgb(scheme.surface as number)
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  const black = dark ? '#000000' : '#ffffff'
  const tint = dark ? '#ffffff' : hexFromArgb(scheme.surfaceVariant as number)
  const steps: Array<[string, number]> = [
    ['surface-container-lowest', dark ? 0 : 0.5],
    ['surface-container-low', dark ? 0.045 : 0.28],
    ['surface-container', dark ? 0.09 : 0.45],
    ['surface-container-high', dark ? 0.135 : 0.6],
    ['surface-container-highest', dark ? 0.18 : 0.75]
  ]
  const out: Array<[string, string]> = steps.map(([name, t]) => [name, mixHex(surface, tint, t)])
  out.push(['surface-dim', mixHex(surface, black, dark ? 0.45 : 0.06)])
  out.push(['surface-bright', mixHex(surface, dark ? '#ffffff' : black, dark ? 0.08 : 0.5)])
  return out
}

function schemeToVars(scheme: Scheme): string {
  const base: Array<[string, string]> = ROLE_VARS.map(([name, role]) => [
    `--md-${name}`,
    hexFromArgb(scheme[role] as number)
  ])
  const derived: Array<[string, string]> = derivedRoles(scheme).map(([name, value]) => [`--md-${name}`, value])
  return [...base, ...derived].map(([n, v]) => `${n}: ${v}`).join(';')
}

/** apply light/dark tonal scheme as CSS variables on <html> */
export function applyTheme(mode: 'dark' | 'light'): void {
  const theme = getTheme()
  const scheme = mode === 'dark' ? theme.schemes.dark : theme.schemes.light
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.cssText = schemeToVars(scheme)
}
