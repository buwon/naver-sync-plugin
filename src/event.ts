import { TFile } from 'obsidian'
import { db } from './database'

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
    if (file instanceof TFile) {
      const item = {
        mode: 'U',
        ...getFileInfo(file),
      }

      db.file.put(item)
      // const content = await this.app.vault.readBinary(file)
      // const base64 = Buffer.from(content).toString('base64')
      // const hash = await this.app.vault.getAbstractFileByPath(file.path)?.stat.hash
      // console.log('File modified:', item, base64)
    }
    console.log('File modified:', file)
  },

  create: async (file: TFile) => {
    if (file instanceof TFile) {
      const item = {
        mode: 'C',
        ...getFileInfo(file),
      }

      db.file.put(item)

      console.log('File created:', file)
    }
  },
  delete: async (file: TFile) => {
    if (file instanceof TFile) {
      const item = {
        mode: 'D',
        ...getFileInfo(file),
      }

      db.file.put(item)

      console.log('File deleted:', file)
    }
  },
  rename: async (file: TFile, oldPath: string) => {
    if (file instanceof TFile) {
      const item = {
        mode: 'C',
        ...getFileInfo(file),
      }
      db.file.put(item)

      const oldItem = {
        mode: 'D',
        ...getFileInfo(file),
        key: oldPath,
      }
      db.file.put(oldItem)
    }
    console.log('File moved from:', oldPath, 'to:', file.path)
  },
}
