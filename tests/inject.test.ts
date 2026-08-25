import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { injectAtMarker } from '../src/lib/inject'

describe('injectAtMarker', () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtao-inject-'))
    file = path.join(dir, 'main.py')
    fs.writeFileSync(file, 'before\n# MARKER\nafter\n')
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('inserts code right before the marker', () => {
    injectAtMarker(file, '# MARKER', 'inserted_line()')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toBe('before\ninserted_line()\n# MARKER\nafter\n')
  })

  it('does not insert the same code twice', () => {
    injectAtMarker(file, '# MARKER', 'inserted_line()')
    injectAtMarker(file, '# MARKER', 'inserted_line()')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content.split('inserted_line()').length - 1).toBe(1)
  })

  it('stacks multiple different injections above the same marker, in insertion order', () => {
    injectAtMarker(file, '# MARKER', 'first()')
    injectAtMarker(file, '# MARKER', 'second()')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toBe('before\nfirst()\nsecond()\n# MARKER\nafter\n')
  })

  it('throws when the marker is missing', () => {
    expect(() => injectAtMarker(file, '# NOT_THERE', 'x()')).toThrow(/Marker/)
  })

  it('matches the marker\'s own indentation, including across repeated injections', () => {
    const indentedFile = path.join(dir, 'indented.py')
    fs.writeFileSync(indentedFile, 'class Settings:\n    field_a: str = "a"\n\n    # MARKER\n')

    injectAtMarker(indentedFile, '# MARKER', 'field_b: str = "b"')
    injectAtMarker(indentedFile, '# MARKER', 'field_c: str = "c"\nfield_d: str = "d"')

    const content = fs.readFileSync(indentedFile, 'utf-8')
    expect(content).toBe(
      'class Settings:\n' +
        '    field_a: str = "a"\n\n' +
        '    field_b: str = "b"\n' +
        '    field_c: str = "c"\n' +
        '    field_d: str = "d"\n' +
        '    # MARKER\n',
    )
  })
})
