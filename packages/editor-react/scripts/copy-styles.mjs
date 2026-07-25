import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDirectory = join(packageRoot, 'dist')

await mkdir(outputDirectory, { recursive: true })
await copyFile(
  join(packageRoot, 'src', 'styles', 'editor.css'),
  join(outputDirectory, 'styles.css'),
)
