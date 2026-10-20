import { NextResponse } from 'next/server'
import { connectedInstances, assertInstanceAccess } from '@/lib/instances'
import { api } from '@/lib/n8n'
import { getProject } from '@/lib/projects'
import { readBindings } from '@/lib/workflow-bindings'
import { sanitizeWorkflow, findHardcodedSecret, checkImportable, slugifyName } from '@/lib/sanitize-core.mjs'

export const dynamic = 'force-dynamic'

/** Read the current source workflow; downloading never writes to n8n or project files. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  const fail = (message: string, status: number) => NextResponse.json({ message }, { status, headers })
  try {
    let instanceId = params.get('instance')
    let workflowId = params.get('workflow')
    const slug = params.get('project')
    const file = params.get('file')
    const instances = connectedInstances()
    if (slug || file) {
      if (!slug || !file) return fail('Choose a project workflow.', 400)
      const project = getProject(slug)
      if (!project || project.kind === 'workflow-audit' || !project.workflows.some(w => w.file === file && !w.parseError)) return fail('Project workflow not found.', 404)
      const binding = readBindings(slug).workflows.find(b => b.file === file)
      if (!binding) return fail('Link the verified source in n8n before downloading its current version.', 409)
      instanceId = instances.find(i => i.uid === binding.source.installation)?.id ?? null
      workflowId = binding.source.workflowId
    }
    if (!workflowId || !instanceId) return fail('The source n8n connection is unavailable. Check Settings.', 409)
    const instance = instances.find(i => i.id === instanceId)
    if (!instance) return fail('The n8n connection is unavailable or paused. Check Settings.', 409)
    const raw = await api<unknown>(instance, `/workflows/${encodeURIComponent(workflowId)}`)
    const clean = sanitizeWorkflow(raw)
    const secret = findHardcodedSecret(clean)
    if (secret) return fail('Download blocked: remove hardcoded secrets from the workflow using n8n credentials first.', 422)
    if (checkImportable(clean).length) return fail('Download blocked: the workflow definition is not importable.', 422)
    assertInstanceAccess(instance)
    const filename = `${slugifyName(clean.name).slice(0, 100) || 'workflow'}.json`
    return new NextResponse(JSON.stringify(clean, null, 2) + '\n', {
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` },
    })
  } catch {
    return fail('Could not download the workflow from n8n. Check the connection and workflow access, then retry.', 502)
  }
}
