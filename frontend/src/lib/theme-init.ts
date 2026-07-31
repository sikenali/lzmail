// Initialize theme based on localStorage or system preference
export function initTheme() {
  const saved = localStorage.getItem('lzmail_theme')
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    document.documentElement.setAttribute('data-theme', saved)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  }
}

// Apply theme directly
export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
