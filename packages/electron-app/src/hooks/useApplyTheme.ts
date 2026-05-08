import { useEffect } from 'react'
import { ALL_THEMES } from '@/types'

export function useApplyTheme(theme: string | undefined): void {
  useEffect(() => {
    if (!theme) return
    const root = document.documentElement
    for (const t of ALL_THEMES) root.classList.remove(`theme-${t}`)
    root.classList.add(`theme-${theme}`)
  }, [theme])
}
