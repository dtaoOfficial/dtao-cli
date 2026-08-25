import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export interface CopyEntry {
  from: string
  to: string
}

export interface InjectEntry {
  file: string
  marker: string
  code: string
}

export interface ComponentDefinition {
  version: string
  description: string
  dependsOn?: string[]
  frontend?: { copy: CopyEntry[]; inject?: InjectEntry[] }
  backend?: { copy: CopyEntry[]; inject?: InjectEntry[]; requirements?: string[] }
  postInstall?: { seedCommand?: string[]; seedDescription?: string }
}

export interface Registry {
  components: Record<string, ComponentDefinition>
}

// Private repo — access is controlled by GitHub itself (SSH key / git
// credentials on the machine running the CLI), not by anything embedded in
// this package. No secrets to leak: if you can't `git clone` it, you can't
// use it. Set DTAO_REGISTRY_PATH to point at a local checkout instead
// (used for local development of the registry itself).
const REGISTRY_GIT_URL = 'git@github.com:dtaoOfficial/component-registry.git'

function registryRoot(): string {
  if (process.env.DTAO_REGISTRY_PATH) {
    return process.env.DTAO_REGISTRY_PATH
  }
  const cacheDir = path.join(os.homedir(), '.dtao', 'registry')
  ensureRegistryCloned(cacheDir)
  return cacheDir
}

function ensureRegistryCloned(cacheDir: string): void {
  if (fs.existsSync(path.join(cacheDir, '.git'))) {
    try {
      execFileSync('git', ['-C', cacheDir, 'pull', '--ff-only'], { stdio: 'ignore' })
    } catch {
      // offline, or local cache diverged — fall back to whatever is already cached
    }
    return
  }
  fs.mkdirSync(path.dirname(cacheDir), { recursive: true })
  try {
    execFileSync('git', ['clone', REGISTRY_GIT_URL, cacheDir], { stdio: 'inherit' })
  } catch {
    throw new Error(
      `Could not clone the private component registry (${REGISTRY_GIT_URL}). ` +
        'Make sure your GitHub account has access and your SSH key is set up.',
    )
  }
}

export function loadRegistry(): Registry {
  const registryJsonPath = path.join(registryRoot(), 'registry.json')
  const raw = fs.readFileSync(registryJsonPath, 'utf-8')
  return JSON.parse(raw)
}

export function getComponent(name: string): ComponentDefinition {
  const registry = loadRegistry()
  const component = registry.components[name]
  if (!component) {
    throw new Error(`Unknown component "${name}". Available: ${Object.keys(registry.components).join(', ')}`)
  }
  return component
}

export function componentSourcePath(...segments: string[]): string {
  return path.join(registryRoot(), 'components', ...segments)
}
