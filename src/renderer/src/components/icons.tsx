import { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...rest }: P): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest
  }
}

export const IconMail = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
)

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
  </svg>
)

export const IconUsers = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5M17.5 14.6c2 .6 3.3 2 3.8 4.4" />
  </svg>
)

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8 13.9 5h2.9l.9 2.7 2.5 1.5-.6 2.8 1.2 2.6-2 2.2-.3 2.9-2.8.7-1.7 2.4-2.9-.8-2.9.8-1.7-2.4-2.8-.7-.3-2.9-2-2.2L3.8 12l-.6-2.8 2.5-1.5.9-2.7h2.9L12 2.8Z" />
  </svg>
)

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
)

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    <path d="M10 11v5.5M14 11v5.5" />
  </svg>
)

export const IconPencil = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4.2L19.5 8.7a2.1 2.1 0 0 0-3-3L5.3 17 4 20Z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
)

export const IconKey = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="14" r="4" />
    <path d="m11 11 8.5-8.5M16 6l2.5 2.5M13.5 8.5 16 11" />
  </svg>
)

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 3v4h-4" />
  </svg>
)

export const IconArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5m6-7-7 7 7 7" />
  </svg>
)

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconMore = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <circle cx="12" cy="5.5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="18.5" r="1.7" />
  </svg>
)

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const IconMinimize = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 12h12" />
  </svg>
)

export const IconMaximize = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

export const IconEyeOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4.5 20 19.5M9.9 6.2A9.4 9.4 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.6M6 8.2A16 16 0 0 0 2.5 12S6 18.2 12 18.2a9.7 9.7 0 0 0 3.5-.7" />
    <path d="M9.4 9.7a3 3 0 0 0 4.3 4.2" />
  </svg>
)

export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5.5 14.5A2.5 2.5 0 0 1 4 12.2V6.5A2.5 2.5 0 0 1 6.5 4h5.7a2.5 2.5 0 0 1 2.3 1.5" />
  </svg>
)

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14" />
  </svg>
)

export const IconInbox = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 13 6.2 5.6A1.5 1.5 0 0 1 7.6 4.5h8.8a1.5 1.5 0 0 1 1.4 1.1L20 13v4.5a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.5V13Z" />
    <path d="M4 13h4.5l1.2 2.2h4.6L15.5 13H20" />
  </svg>
)

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 10v4.2m0 2.8v.2" />
  </svg>
)

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.2" />
  </svg>
)

export const IconWand = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 19 9.5-9.5M13 4.8l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3ZM19 12l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8ZM7.5 3l.6 1.6L9.7 5l-1.6.6L7.5 7.2 6.9 5.6 5.3 5l1.6-.4.6-1.6Z" />
  </svg>
)

export const IconStacks = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="6.5" rx="2" />
    <rect x="4" y="13.5" width="16" height="6.5" rx="2" />
    <path d="M8 7.2h.01M8 16.8h.01" />
  </svg>
)

export const IconPaperclip = (p: P) => (
  <svg {...base(p)}>
    <path d="m8 12.5 6.7-6.7a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a5.4 5.4 0 0 1-7.6-7.6l7.8-7.8" />
  </svg>
)
