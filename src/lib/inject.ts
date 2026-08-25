import * as fs from 'fs'

export function injectAtMarker(filePath: string, marker: string, code: string): void {
  const content = fs.readFileSync(filePath, 'utf-8')

  const markerIndex = content.indexOf(marker)
  if (markerIndex === -1) {
    throw new Error(`Marker "${marker}" not found in ${filePath}`)
  }

  // Match the marker's own indentation so repeated injections into an
  // indented spot (a JSX block, a Python class body) stay readable instead
  // of drifting to column 0 after the first injection.
  const lineStart = content.lastIndexOf('\n', markerIndex) + 1
  const indent = content.slice(lineStart, markerIndex)
  const indentedCode = code
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n')

  if (content.includes(indentedCode)) {
    return
  }

  const updated = content.replace(marker, `${indentedCode}\n${indent}${marker}`)
  fs.writeFileSync(filePath, updated)
}
