import * as path from 'path'
import { describe, expect, it } from 'vitest'

// Real registry data, same as registry.test.ts -- resolving against the
// actual 56-component dependency graph is a more meaningful test than a
// synthetic one.
process.env.DTAO_REGISTRY_PATH = path.resolve(__dirname, '..', '..', 'component-registry')

import { resolveInstallPlan } from '../src/commands/add'

describe('resolveInstallPlan', () => {
  it('pulls in every real transitive dependency, not just the one named', () => {
    const plan = resolveInstallPlan(['avatar-upload'], [])
    expect(plan).toEqual(['login', 'user-profile-page', 'file-image-upload', 'toast-notifications', 'avatar-upload'])
  })

  it('never adds something before its own real dependency', () => {
    const plan = resolveInstallPlan(['avatar-upload'], [])
    expect(plan.indexOf('login')).toBeLessThan(plan.indexOf('user-profile-page'))
    expect(plan.indexOf('user-profile-page')).toBeLessThan(plan.indexOf('avatar-upload'))
    expect(plan.indexOf('file-image-upload')).toBeLessThan(plan.indexOf('avatar-upload'))
    expect(plan.indexOf('toast-notifications')).toBeLessThan(plan.indexOf('avatar-upload'))
  })

  it('skips whatever is already installed, real or transitive', () => {
    const plan = resolveInstallPlan(['avatar-upload'], ['login', 'user-profile-page'])
    expect(plan).toEqual(['file-image-upload', 'toast-notifications', 'avatar-upload'])
  })

  it('returns nothing when everything requested is already installed', () => {
    const plan = resolveInstallPlan(['login'], ['login'])
    expect(plan).toEqual([])
  })

  it('resolves multiple requested components in one real plan, deduping shared dependencies', () => {
    const plan = resolveInstallPlan(['avatar-upload', 'two-factor-auth-setup'], [])
    // login/user-profile-page/toast-notifications are shared -- must appear exactly once
    expect(plan.filter((n) => n === 'login')).toHaveLength(1)
    expect(plan.filter((n) => n === 'user-profile-page')).toHaveLength(1)
    expect(plan.filter((n) => n === 'toast-notifications')).toHaveLength(1)
    expect(plan).toContain('avatar-upload')
    expect(plan).toContain('two-factor-auth-setup')
  })
})
