import { useId } from 'react'

/**
 * App logo — gradient squircle tile, white envelope, generation sparkle.
 * Mirrors build/icon.svg so the window icon and in-app marks stay identical.
 */
export function Logo({ size = 24 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const bgId = `logo-bg-${uid}`
  const glossId = `logo-gloss-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Email Handler logo">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B7CF8" />
          <stop offset="0.55" stopColor="#A766EC" />
          <stop offset="1" stopColor="#E0559F" />
        </linearGradient>
        <linearGradient id={glossId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${bgId})`} />
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${glossId})`} />
      <rect x="3" y="3" width="58" height="58" rx="16" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="15" y="22.5" width="34" height="24.5" rx="6.5" fill="#ffffff" />
      <path
        d="M17.5 26.5 32 38.5 46.5 26.5"
        fill="none"
        stroke="#5B49D6"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50.5 7.5 52.4 13.1 58 15 52.4 16.9 50.5 22.5 48.6 16.9 43 15 48.6 13.1 Z"
        fill="#ffffff"
        opacity="0.96"
      />
    </svg>
  )
}
