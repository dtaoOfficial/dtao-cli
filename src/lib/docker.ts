import { spawn } from 'child_process'

export function runCommand(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}

export async function waitForHealth(url: string, timeoutMs = 60000, intervalMs = 1500): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const body = (await res.json()) as { status?: string }
        if (body.status === 'ok') return true
      }
    } catch {
      // backend not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}
