import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cwd } from 'node:process'

import packageJSON from '../package.json' with { type: 'json' }

interface ObsidianPluginManifest {
  id: string
  name: string
  version: string
  minAppVersion: string
  description: string
  author: string
  authorUrl: string
  isDesktopOnly: boolean
}

export async function generateObsidianPluginManifest() {
  const manifest = {
    id: 'naver-sync-plugin',
    name: 'Naver Sync',
    version: packageJSON.version,
    minAppVersion: '1.4.0',
    description: 'Sync your Obsidian notes with Naver Memo service.',
    author: 'Buwon Lee',
    authorUrl: 'https://github.com/buwon/naver-sync-plugin',
    isDesktopOnly: false,
  } satisfies ObsidianPluginManifest

  await writeFile(join(cwd(), 'dist', 'manifest.json'), JSON.stringify(manifest, null, 2))
}

generateObsidianPluginManifest().catch((error) => {
  console.error('Error generating manifest.json:', error)
  process.exit(1)
})
