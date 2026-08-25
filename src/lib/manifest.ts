import * as fs from 'fs'
import * as path from 'path'

export interface DtaoManifest {
  projectName: string
  database: 'mongo'
  components: string[]
  pages: { name: string; route: string }[]
}

const MANIFEST_DIR = '.dtao'
const MANIFEST_FILE = 'manifest.json'

export function manifestPath(projectRoot: string): string {
  return path.join(projectRoot, MANIFEST_DIR, MANIFEST_FILE)
}

export function readManifest(projectRoot: string): DtaoManifest {
  const p = manifestPath(projectRoot)
  if (!fs.existsSync(p)) {
    throw new Error(`No .dtao/manifest.json found in ${projectRoot}. Run "dtao init" first.`)
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

export function writeManifest(projectRoot: string, manifest: DtaoManifest): void {
  const dir = path.join(projectRoot, MANIFEST_DIR)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(manifestPath(projectRoot), JSON.stringify(manifest, null, 2) + '\n')
}

export function addComponent(projectRoot: string, componentName: string): void {
  const manifest = readManifest(projectRoot)
  if (!manifest.components.includes(componentName)) {
    manifest.components.push(componentName)
    writeManifest(projectRoot, manifest)
  }
}
