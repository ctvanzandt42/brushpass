import { Link } from 'react-router-dom'
import { useTheme } from '../lib/theme'

export default function AppHeader({ title, children }) {
  const { theme, toggle } = useTheme()

  return (
    <header className="app-header">
      <Link to="/" className="header-left" style={{ textDecoration: 'none' }}>
        <span className="logo-icon-sm">🕵️</span>
        <span className="header-team">{title}</span>
      </Link>
      <nav className="header-nav">
        {children}
        <button
          onClick={toggle}
          className="nav-link theme-toggle"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </nav>
    </header>
  )
}
