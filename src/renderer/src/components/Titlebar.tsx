import { IconClose, IconMaximize, IconMinimize } from './icons'
import { Logo } from './Logo'
import './Titlebar.css'

export function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <span className="brand-mark">
          <Logo size={22} />
        </span>
        <span className="brand-name">Email Handler</span>
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn" onClick={() => window.api.windowMinimize()} aria-label="Minimize">
          <IconMinimize size={16} />
        </button>
        <button className="tb-btn" onClick={() => window.api.windowMaximize()} aria-label="Maximize">
          <IconMaximize size={14} />
        </button>
        <button className="tb-btn tb-close" onClick={() => window.api.windowClose()} aria-label="Close">
          <IconClose size={15} />
        </button>
      </div>
    </div>
  )
}
