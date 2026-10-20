import './test-loader.mjs'
import { registerHooks } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-download-'))
process.env.WORKSPACE_ROOT = root
process.env.DATABASE_PATH = path.join(root, 'download.db')
process.env.CONTROL_CENTER_ENV_FILE = path.join(root, '.env.local')
process.env.CONTROL_CENTER_BACKGROUND = 'off'
process.env.CONTROL_CENTER_OFFLINE = '0'
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return { url: new URL(`../${specifier.slice(2)}${path.extname(specifier) ? '' : '.ts'}`, import.meta.url).href, shortCircuit: true }
  if (specifier === 'next/server') return next('next/server.js', context)
  return next(specifier, context)
} })
const { GET } = await import('../app/api/workflow-download/route.ts')
const { db } = await import('./db.ts')
const source = { id: 'download-fixture', uid: 'download-source' }
db.prepare('INSERT INTO instances(id, uid, name, base_url) VALUES (?, ?, ?, ?)').run(source.id, source.uid, 'Download fixture', 'http://fixture.invalid')
process.env.N8N_API_KEY__DOWNLOAD_FIXTURE = 'fixture-key'
let raw
const calls = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  calls.push({ url, method: options.method })
  return Response.json(raw)
}
const workflow = () => ({ id: 'one', name: 'Latest workflow', nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }], connections: {}, active: true, pinData: { private: true }, staticData: { private: true } })
const request = (query) => GET(new Request(`http://localhost/api/workflow-download?${query}`))
const direct = new URLSearchParams({ instance: source.id, workflow: 'one' })

test('downloads fresh sanitized JSON with an attachment filename using only GET', async () => {
  raw = workflow()
  const response = await request(direct)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-disposition'), /attachment; filename="latest-workflow.json"/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.equal(body.name, 'Latest workflow')
  for (const key of ['active', 'pinData', 'staticData']) assert.equal(key in body, false)
  assert.deepEqual(calls.map(c => c.method), ['GET'])
})
test('refuses hardcoded secrets and malformed graph without returning source content', async () => {
  raw = workflow()
  raw.nodes[0].parameters = { password: 'fictional-secret-for-test' }
  let response = await request(direct)
  assert.equal(response.status, 422)
  assert.doesNotMatch(await response.text(), /fictional-secret-for-test/)
  raw = workflow()
  raw.connections = { Missing: { main: [[{ node: 'Absent', type: 'main', index: 0 }]] } }
  response = await request(direct)
  assert.equal(response.status, 422)
})
test('paused connections cannot be used', async () => {
  const before = calls.length
  db.prepare('UPDATE instances SET paused = 1 WHERE id = ?').run(source.id)
  assert.equal((await request(direct)).status, 409)
  assert.equal(calls.length, before)
  db.prepare('UPDATE instances SET paused = 0 WHERE id = ?').run(source.id)
})
test('project downloads resolve source installation bindings, never uploaded workflow IDs', async () => {
  const dir = path.join(root, 'n8n workflows', 'download-fixture')
  fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'documentation'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'README.md'), '# Download fixture\n')
  fs.writeFileSync(path.join(dir, 'workflows', '01-start.json'), JSON.stringify(workflow()))
  const query = new URLSearchParams({ project: 'download-fixture', file: '01-start.json' })
  assert.equal((await request(query)).status, 409)
  fs.writeFileSync(path.join(dir, 'documentation', 'workflow-bindings.json'), JSON.stringify({ version: 1, workflows: [{ key: 'fixture', file: '01-start.json', source: { installation: source.uid, workflowId: 'bound-source' }, targets: [] }] }))
  raw = workflow()
  assert.equal((await request(query)).status, 200)
  assert.equal(calls.at(-1).url, 'http://fixture.invalid/api/v1/workflows/bound-source')
  query.set('file', '../01-start.json')
  assert.equal((await request(query)).status, 404)
})
test.after(() => { globalThis.fetch = originalFetch; db.close() })
