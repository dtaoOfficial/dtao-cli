import * as path from 'path'
import { describe, expect, it } from 'vitest'

// Point at the local checkout instead of git-cloning the private repo over
// the network on every test run.
process.env.DTAO_REGISTRY_PATH = path.resolve(__dirname, '..', '..', 'component-registry')

import { getComponent, loadRegistry } from '../src/lib/registry'

describe('registry', () => {
  it('loads the login component definition', () => {
    const registry = loadRegistry()
    expect(registry.components.login).toBeDefined()
  })

  it('getComponent returns the login component', () => {
    const component = getComponent('login')
    expect(component.frontend?.copy.length).toBeGreaterThan(0)
    expect(component.backend?.copy.length).toBeGreaterThan(0)
  })

  it('throws a helpful error for an unknown component', () => {
    expect(() => getComponent('does-not-exist')).toThrow(/Unknown component/)
  })
})
