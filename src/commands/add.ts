import * as fs from 'fs'
import * as path from 'path'
import * as p from '@clack/prompts'
import { getComponent, componentSourcePath, ComponentDefinition } from '../lib/registry'
import { copyFile } from '../lib/scaffold'
import { injectAtMarker } from '../lib/inject'
import { addComponent, readManifest } from '../lib/manifest'
import { runCommand, waitForHealth } from '../lib/docker'

export interface AddOptions {
  yes?: boolean
}

// Resolves the real dependency closure for whatever was asked for, in a
// valid install order (a component's own dependencies always come first),
// skipping anything already installed. So `dtao add avatar-upload` alone
// pulls in login/user-profile-page/file-image-upload/toast-notifications
// too if they aren't there yet -- no more manually working out and typing
// the whole chain one command at a time.
export function resolveInstallPlan(requested: string[], alreadyInstalled: string[]): string[] {
  const plan: string[] = []
  const seen = new Set(alreadyInstalled)
  const visiting = new Set<string>()

  function visit(name: string) {
    if (seen.has(name)) return
    if (visiting.has(name)) {
      p.cancel(`Circular dependency detected involving "${name}".`)
      process.exit(1)
    }
    let component: ComponentDefinition
    try {
      component = getComponent(name)
    } catch (err) {
      p.cancel((err as Error).message)
      process.exit(1)
    }
    visiting.add(name)
    for (const dep of component.dependsOn ?? []) {
      visit(dep)
    }
    visiting.delete(name)
    seen.add(name)
    plan.push(name)
  }

  for (const name of requested) {
    if (alreadyInstalled.includes(name)) {
      p.log.warn(`"${name}" is already added to this project -- skipping.`)
      continue
    }
    visit(name)
  }

  return plan
}

function installOne(projectRoot: string, name: string): ComponentDefinition {
  const component = getComponent(name)
  const spinner = p.spinner()
  spinner.start(`Copying ${name} files`)

  try {
    for (const entry of component.frontend?.copy ?? []) {
      copyFile(componentSourcePath(name, entry.from), path.join(projectRoot, 'frontend', entry.to))
    }
    for (const entry of component.backend?.copy ?? []) {
      copyFile(componentSourcePath(name, entry.from), path.join(projectRoot, 'backend', entry.to))
    }
    for (const entry of component.frontend?.inject ?? []) {
      injectAtMarker(path.join(projectRoot, 'frontend', entry.file), entry.marker, entry.code)
    }
    for (const entry of component.backend?.inject ?? []) {
      injectAtMarker(path.join(projectRoot, 'backend', entry.file), entry.marker, entry.code)
    }

    if (component.backend?.requirements?.length) {
      const reqPath = path.join(projectRoot, 'backend', 'requirements.txt')
      const existing = fs.readFileSync(reqPath, 'utf-8')
      const existingLines = new Set(
        existing
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      )
      const toAdd = component.backend.requirements.filter((r) => !existingLines.has(r))
      if (toAdd.length) {
        fs.appendFileSync(reqPath, (existing.endsWith('\n') ? '' : '\n') + toAdd.join('\n') + '\n')
      }
    }

    addComponent(projectRoot, name)
  } catch (err) {
    spinner.stop(`Failed to copy ${name}`, 1)
    p.log.error((err as Error).stack ?? String(err))
    process.exit(1)
  }
  spinner.stop(`${name} files added`)
  return component
}

export async function addCommand(names: string[], opts: AddOptions): Promise<void> {
  const projectRoot = process.cwd()

  let manifest
  try {
    manifest = readManifest(projectRoot)
  } catch (err) {
    p.cancel((err as Error).message)
    process.exit(1)
  }

  const plan = resolveInstallPlan(names, manifest.components)

  if (plan.length === 0) {
    p.outro('Nothing to do -- everything requested is already installed.')
    return
  }

  const extras = plan.filter((n) => !names.includes(n))
  p.intro(`dtao add ${plan.join(' ')}`)
  if (extras.length > 0) {
    p.log.step(`Also adding real dependencies you didn't ask for by name: ${extras.join(', ')}`)
  }

  let postInstall: ComponentDefinition['postInstall'] | undefined
  for (const name of plan) {
    const component = installOne(projectRoot, name)
    if (component.postInstall?.seedCommand) {
      postInstall = component.postInstall
    }
  }

  if (!postInstall?.seedCommand) {
    p.outro('Done.')
    return
  }

  let shouldStart = opts.yes ?? false
  if (!opts.yes) {
    const answer = await p.confirm({
      message: 'Start docker compose now and run setup (super admin prompt)?',
    })
    if (p.isCancel(answer)) {
      p.cancel('Cancelled.')
      process.exit(1)
    }
    shouldStart = answer
  }

  if (!shouldStart) {
    p.outro(`Done. When ready:\n  docker compose up -d --build\n  docker compose exec backend ${postInstall.seedCommand.join(' ')}`)
    return
  }

  const buildSpinner = p.spinner()
  buildSpinner.start('Building and starting containers (this can take a minute)')
  const composeCode = await runCommand('docker', ['compose', 'up', '-d', '--build'], projectRoot)
  if (composeCode !== 0) {
    buildSpinner.stop('docker compose failed')
    p.outro('Run "docker compose up -d --build" manually and check the logs.')
    return
  }
  buildSpinner.stop('Containers started')

  const healthSpinner = p.spinner()
  healthSpinner.start('Waiting for backend health check')
  const healthy = await waitForHealth('http://localhost:8001/health')
  healthSpinner.stop(healthy ? 'Backend is healthy and connected to the database' : 'Backend did not become healthy in time')

  if (!healthy) {
    p.outro('Check "docker compose logs backend" for errors.')
    return
  }

  p.log.step('Now set up your super admin:')
  const execArgs = ['compose', 'exec']
  if (!process.stdin.isTTY) execArgs.push('-T')
  execArgs.push('backend', ...postInstall.seedCommand)
  await runCommand('docker', execArgs, projectRoot)

  p.outro('Login is ready. Visit http://localhost:5173')
}
