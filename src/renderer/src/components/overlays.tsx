import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { IconClose } from './icons'
import './overlays.css'

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
}

/** M3E dialog on a blurred scrim */
export function Dialog({ open, onClose, title, icon, children, actions, wide }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className={`dialog glass-strong ${wide ? 'dialog-wide' : ''}`}
            initial={{ scale: 0.88, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={spring}
          >
            {(title || icon) && (
              <div className="dialog-head">
                {icon && <div className="dialog-icon">{icon}</div>}
                <h2 className="dialog-title">{title}</h2>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                  <IconClose size={18} />
                </button>
              </div>
            )}
            <div className="dialog-body">{children}</div>
            {actions && <div className="dialog-actions">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById('overlay-root')!
  )
}

interface MenuProps {
  open: boolean
  onClose: () => void
  anchor: { x: number; y: number } | null
  children: ReactNode
}

/** lightweight context menu positioned at pointer */
export function Menu({ open, onClose, anchor, children }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!anchor) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="menu glass-strong"
          initial={{ opacity: 0, scale: 0.85, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={spring}
          style={{
            left: Math.min(anchor.x, window.innerWidth - 220),
            top: Math.min(anchor.y, window.innerHeight - (children ? 340 : 60))
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById('overlay-root')!
  )
}

export function MenuItem({
  icon,
  children,
  danger,
  onClick
}: {
  icon?: ReactNode
  children: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button className={`menu-item ${danger ? 'menu-item-danger' : ''}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  )
}

// ---------- snackbar system ----------

interface Snack {
  id: number
  text: string
  kind: 'info' | 'success' | 'error'
}

const SnackContext = createContext<(text: string, kind?: Snack['kind']) => void>(() => {})

export function useSnack() {
  return useContext(SnackContext)
}

export function SnackProvider({ children }: { children: ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([])

  const show = useCallback((text: string, kind: Snack['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setSnacks((s) => [...s.slice(-2), { id, text, kind }])
    window.setTimeout(() => setSnacks((s) => s.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <SnackContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="snacks">
          <AnimatePresence>
            {snacks.map((s) => (
              <motion.div
                key={s.id}
                className={`snack glass-strong snack-${s.kind}`}
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.94 }}
                transition={spring}
              >
                {s.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.getElementById('overlay-root')!
      )}
    </SnackContext.Provider>
  )
}
