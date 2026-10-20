'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { WorkflowDownload } from './workflow-download'
import { RestoreButton } from './restore-button'
import { useBackdropClose, useScrollLock } from './use-modal'

export function ProjectWorkflowSettings({ slug, file, name, instances, linked }: {
  slug: string; file: string; name: string; instances: { id: string; name: string }[]; linked: boolean
}) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="btn btn-ghost btn-icon" title="Workflow settings" aria-label={`Settings for ${name}`} onClick={() => setOpen(true)}><Settings2 aria-hidden /></button>
    {open && <Settings onClose={() => setOpen(false)} name={name}>
      <section className="settings-section">
        <div className="settings-section-head"><div><h3>Export workflow</h3><p>Save the current workflow from n8n to your device as a JSON file.</p></div></div>
        <div className="settings-section-body"><WorkflowDownload query={new URLSearchParams({ project: slug, file }).toString()} name={name} /></div>
      </section>
      <section className="settings-section">
        <div className="settings-section-head"><div><h3>Restore saved backup</h3><p>Send this project’s saved JSON back to n8n. Review the changes before restoring.</p></div></div>
        <div className="settings-section-body">{linked ? <RestoreButton slug={slug} file={file} instances={instances} /> : <p className="small muted">Not linked to n8n. Link the verified source before restoring.</p>}</div>
      </section>
    </Settings>}
  </>
}

function Settings({ name, onClose, children }: { name: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useScrollLock()
  const backdrop = useBackdropClose(ref, onClose)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className="dialog modal" aria-labelledby="project-workflow-settings-title" onCancel={e => { e.preventDefault(); onClose() }} {...backdrop}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Close settings"><X aria-hidden /></button>
    <div className="modal-frame">
      <header className="modal-head"><div className="eyebrow">Workflow settings</div><h2 id="project-workflow-settings-title" className="modal-title">{name}</h2></header>
      <div className="modal-scroll">{children}</div>
      <footer className="modal-foot"><button type="button" className="btn" onClick={onClose}>Close</button></footer>
    </div>
  </dialog>
}
