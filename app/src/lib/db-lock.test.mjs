import './test-loader.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import Database from 'better-sqlite3'

test('db initialization waits for short startup locks instead of failing with SQLITE_BUSY', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-db-lock-'))
  const dbPath = path.join(root, 'fixture.db')
  const holder = new Database(dbPath)
  holder.exec('BEGIN IMMEDIATE')
  const start = Date.now()
  const child = spawn(
    process.execPath,
    ['--input-type=module', '-e', "import './src/lib/test-loader.mjs'; const { db } = await import('./src/lib/db.ts'); db.close()"],
    {
      cwd: path.resolve(import.meta.dirname, '../..'),
      env: {
        ...process.env,
        WORKSPACE_ROOT: root,
        DATABASE_PATH: dbPath,
        CONTROL_CENTER_ENV_FILE: path.join(root, '.env.local'),
        CONTROL_CENTER_BACKGROUND: 'off',
        CONTROL_CENTER_OFFLINE: '1',
      },
      windowsHide: true,
    },
  )
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', chunk => { stdout += String(chunk) })
  child.stderr?.on('data', chunk => { stderr += String(chunk) })
  const exitPromise = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code))
  })

  await new Promise(resolve => setTimeout(resolve, 1000))
  holder.exec('COMMIT')
  holder.close()

  const status = await exitPromise
  fs.rmSync(root, { recursive: true, force: true })
  assert.equal(status, 0, `child exited ${status}\nstdout:\n${stdout}\nstderr:\n${stderr}`)
  assert.ok(Date.now() - start >= 900)
})
