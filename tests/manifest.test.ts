import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addComponent, readManifest, writeManifest } from '../src/lib/manifest'

describe('manifest', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtao-manifest-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('throws a clear error when no manifest exists yet', () => {
    expect(() => readManifest(dir)).toThrow(/dtao init/)
  })

  it('writes and reads back a manifest', () => {
    writeManifest(dir, { projectName: 'my-app', database: 'mongo', components: [], pages: [] })
    const manifest = readManifest(dir)
    expect(manifest.projectName).toBe('my-app')
    expect(manifest.components).toEqual([])
  })

  it('adds a component without duplicating it', () => {
    writeManifest(dir, { projectName: 'my-app', database: 'mongo', components: [], pages: [] })
    addComponent(dir, 'login')
    addComponent(dir, 'login')
    const manifest = readManifest(dir)
    expect(manifest.components).toEqual(['login'])
  })
})
