import * as fs from 'fs'
import * as path from 'path'
import * as p from '@clack/prompts'
import { getComponent, componentSourcePath } from '../lib/registry'
import { copyFile } from '../lib/scaffold'
import { injectAtMarker } from '../lib/inject'
import { addComponent, readManifest } from '../lib/manifest'
import { runCommand, waitForHealth } from '../lib/docker'

export interface AddOptions {
  yes?: boolean
}

export async function addCommand(name: string, opts: AddOptions): Promise<void> {
  p.intro(`dtao add ${name}`)

  const projectRoot = process.cwd()

  let manifest
  try {
    manifest = readManifest(projectRoot)
  } catch (err) {
    p.cancel((err as Error).message)
    process.exit(1)
  }

  if (manifest.components.includes(name)) {
    p.cancel(`"${name}" is already added to this project.`)
    process.exit(1)
  }

  let component
  try {
    component = getComponent(name)
  } catch (err) {
    p.cancel((err as Error).message)
    process.exit(1)
  }

  const missingDeps = (component.dependsOn ?? []).filter((dep) => !manifest.components.includes(dep))
  if (missingDeps.length) {
    p.cancel(`"${name}" requires ${missingDeps.join(', ')} to be installed first. Run: dtao add ${missingDeps[0]}`)
    process.exit(1)
  }

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
    spinner.stop('Failed to copy files', 1)
    p.log.error((err as Error).stack ?? String(err))
    process.exit(1)
  }
  spinner.stop(`${name} files added`)

  if (!component.postInstall?.seedCommand) {
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
    p.outro(
      `Done. When ready:\n  docker compose up -d --build\n  docker compose exec backend ${component.postInstall.seedCommand.join(' ')}`,
    )
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
  execArgs.push('backend', ...component.postInstall.seedCommand)
  await runCommand('docker', execArgs, projectRoot)

  p.outro('Login is ready. Visit http://localhost:5173')
}
