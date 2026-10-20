'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ConfirmDialog } from './confirm-dialog'

export function WorkflowDownload({ query, name }: { query: string; name: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  async function download() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflow-download?${query}`, { cache: 'no-store' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Could not download the workflow.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'workflow.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not download the workflow.')
    } finally { setBusy(false) }
  }
  return <>
    <button type="button" className="btn btn-ghost" disabled={busy} aria-busy={busy} aria-label={`Download JSON for ${name}`} title="Download the current workflow from n8n to your device" onClick={() => setConfirming(true)}>
      <Download aria-hidden /> {busy ? 'Downloading…' : 'Download JSON'}
    </button>
    {error && <p className="small" role="alert" style={{ whiteSpace: 'normal' }}>{error}</p>}
    {confirming && <ConfirmDialog open title="Download workflow JSON?" confirmLabel="Download JSON" onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); void download() }}>
      <p>Download the current version of <strong>{name}</strong> from n8n as a JSON file to your device?</p>
      <p>Pinned data and runtime state are removed. Nothing changes in n8n or your saved project backup.</p>
    </ConfirmDialog>}
  </>
}
