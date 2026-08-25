import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as p from '@clack/prompts'
import { copyDir } from '../lib/scaffold'
import { writeManifest } from '../lib/manifest'

const TEMPLATES_BASE = path.resolve(__dirname, '..', '..', 'templates', 'base')

export interface InitOptions {
  name?: string
  db?: string
}

export async function initCommand(opts: InitOptions): Promise<void> {
  p.intro('dtao init')

  let projectName = opts.name
  if (!projectName) {
    const answer = await p.text({
      message: 'Project name?',
      placeholder: 'my-app',
      validate: (value) => {
        if (!value) return 'Project name is required'
        if (!/^[a-z0-9-]+$/i.test(value)) return 'Use letters, numbers, and dashes only'
        return undefined
      },
    })
    if (p.isCancel(answer)) {
      p.cancel('Cancelled.')
      process.exit(1)
    }
    projectName = answer
  }

  let database = opts.db
  if (!database) {
    const answer = await p.select({
      message: 'Which database?',
      options: [{ value: 'mongo', label: 'MongoDB' }],
    })
    if (p.isCancel(answer)) {
      p.cancel('Cancelled.')
      process.exit(1)
    }
    database = answer as string
  }

  const projectRoot = path.resolve(process.cwd(), projectName)

  if (fs.existsSync(projectRoot)) {
    p.cancel(`"${projectName}" already exists in this directory.`)
    process.exit(1)
  }

  const spinner = p.spinner()
  spinner.start('Scaffolding project')

  fs.mkdirSync(projectRoot, { recursive: true })
  copyDir(path.join(TEMPLATES_BASE, 'frontend'), path.join(projectRoot, 'frontend'))
  copyDir(path.join(TEMPLATES_BASE, 'backend'), path.join(projectRoot, 'backend'))
  fs.copyFileSync(path.join(TEMPLATES_BASE, 'docker-compose.yml'), path.join(projectRoot, 'docker-compose.yml'))

  const envExample = fs.readFileSync(path.join(projectRoot, 'backend', '.env.example'), 'utf-8')
  const secret = crypto.randomBytes(32).toString('hex')
  const env = envExample.replace('replace-with-a-long-random-secret', secret)
  fs.writeFileSync(path.join(projectRoot, 'backend', '.env'), env)

  fs.copyFileSync(path.join(projectRoot, 'frontend', '.env.example'), path.join(projectRoot, 'frontend', '.env'))

  writeManifest(projectRoot, {
    projectName,
    database: database as 'mongo',
    components: [],
    pages: [],
  })

  spinner.stop('Project scaffolded')

  p.outro(`Done. Next:\n  cd ${projectName}\n  dtao add login\n  docker compose up -d --build`)
}
