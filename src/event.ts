import { TFile } from 'obsidian'
import { db } from './database'
import { syncState } from './syncState'
import { ItemInfoType } from './types'

function getFileInfo(file: TFile) {
  return {
    key: file.path,
    cTime: file.stat.ctime,
    mTime: file.stat.mtime,
    size: file.stat.size,
  }
}

export const event = {
  modify: async (file: TFile) => {
    if (syncState.lockFile.has(file.path)) return

    if (file instanceof TFile) {
      const item = {
        status: 'U',
        ...getFileInfo(file),
      }

      db.file.put(item)
    }
    console.log('File modified:', file)
  },

  create: async (file: TFile) => {
    if (syncState.lockFile.has(file.path)) return

    if (file instanceof TFile) {
      const item = {
        status: 'C',
        ...getFileInfo(file),
      }

      db.file.put(item)

      console.log('File created:', file)
    }
  },
  delete: async (file: TFile) => {
    if (syncState.lockFile.has(file.path)) return

    if (file instanceof TFile) {
      const item: ItemInfoType = {
        status: 'D',
        ...getFileInfo(file),
        mTime: Date.now(),
      }

      db.file.put(item)

      console.log('File deleted:', file)
    }
  },
  rename: async (file: TFile, oldPath: string) => {
    if (syncState.lockFile.has(oldPath)) return

    if (file instanceof TFile) {
      const item = {
        status: 'C',
        ...getFileInfo(file),
      }
      db.file.put(item)

      const oldItem: ItemInfoType = {
        status: 'D',
        ...getFileInfo(file),
        key: oldPath,
        mTime: Date.now(),
      }
      db.file.put(oldItem)
    }
    console.log('File moved from:', oldPath, 'to:', file.path)
  },
}
