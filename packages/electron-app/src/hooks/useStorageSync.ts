import { useEffect } from 'react'

export function useStorageSync(loadData: () => void | Promise<void>): void {
  useEffect(() => {
    void loadData()
    window.electronAPI.onStorageChanged(() => {
      void loadData()
    })
    return () => {
      window.electronAPI.removeStorageListener()
    }
  }, [loadData])
}
