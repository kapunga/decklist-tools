import { useState, useCallback, useEffect } from 'react'
import { Plug, PlugZap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface McpIntegrationCardProps {
  clientId: string
  title: string
  connectedDescription: string
  disconnectedDescription: string
  connectButtonLabel: string
  postConnectionNote: string
}

export function McpIntegrationCard({
  clientId,
  title,
  connectedDescription,
  disconnectedDescription,
  connectButtonLabel,
  postConnectionNote,
}: McpIntegrationCardProps) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.getMcpClientStatus(clientId)
        setConnected(status.connected)
      } catch (err) {
        console.error(`Failed to check ${clientId} status:`, err)
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [clientId])

  const handleConnect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.connectMcpClient(clientId)
      if (result.success) {
        setConnected(true)
      } else {
        setError(result.error || 'Failed to connect')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const handleDisconnect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.disconnectMcpClient(clientId)
      if (result.success) {
        setConnected(false)
      } else {
        setError(result.error || 'Failed to disconnect')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {connected ? (
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <PlugZap className="w-5 h-5 text-green-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Plug className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="font-medium">
                {connected ? `Connected to ${title}` : 'Not Connected'}
              </div>
              <p className="text-sm text-muted-foreground">
                {connected ? connectedDescription : disconnectedDescription}
              </p>
            </div>
          </div>
          <Button
            variant={connected ? 'outline' : 'default'}
            onClick={connected ? handleDisconnect : handleConnect}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {connected ? 'Disconnecting...' : 'Connecting...'}
              </>
            ) : connected ? (
              'Disconnect'
            ) : (
              connectButtonLabel
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        {connected && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {connectedDescription}
            </p>
            <p className="text-xs text-muted-foreground">
              Note: {postConnectionNote}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
