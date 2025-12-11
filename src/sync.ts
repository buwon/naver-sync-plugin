import { TAbstractFile, TFile, Vault } from 'obsidian'
import { db } from './database'
import { ItemInfoType } from './types'
import { Remote } from './remote'

function getFileByPath(vault: Vault, path: string): TFile | null {
  const file: TAbstractFile | null = vault.getAbstractFileByPath(path)
  if (file && file instanceof TFile) {
    return file
  }

  return null
}

export async function sync(vault: Vault, remote: Remote) {
  // update sync start time
  await db.state.put({ key: 'lastSyncTime', value: Date.now() })

  const files = await db.file.toArray().then((items) => {
    const fileMap = new Map<string, ItemInfoType>()
    items.forEach((item) => {
      fileMap.set(item.key, item)
    })
    return fileMap
  })

  // clear local db
  await db.file.clear()

  // download list
  const remoteList: ItemInfoType[] = await remote.fetchList()
  for (const remoteItem of remoteList) {
    const key = remoteItem.key

    if (files.has(key)) {
      const localItem = files.get(key)!
      if (localItem.mTime < remoteItem.mTime) {
        files.delete(key)
      } else {
        continue
      }
    }

    const file: TFile | null = getFileByPath(vault, key)
    // 로컬 파일이 있는 경우
    if (file) {
      if (file.stat.mtime >= remoteItem.mTime) {
        continue
      }
      if ('D' === remoteItem.status) {
        await vault.delete(file)
      } else {
        const content = await remote.downloadFile(key)
        if (content) {
          await vault.modifyBinary(file, content, {
            ctime: remoteItem.cTime,
            mtime: remoteItem.mTime,
          })
        }
      }
    } else {
      if ('D' === remoteItem.status) {
        continue
      } else {
        const content = await remote.downloadFile(key)
        if (content) {
          await vault.createBinary(key, content, {
            ctime: remoteItem.cTime,
            mtime: remoteItem.mTime,
          })
        }
      }
    }
  }

  // upload list
  for (const [key, localItem] of files) {
    if ('D' === localItem.status) {
      await remote.deleteFile(localItem)
      continue
    }
    const file = getFileByPath(vault, key)
    if (!file) {
      continue
    }
    const content = await vault.readBinary(file)
    await remote.uploadFile(localItem, content)
  }

  // update last sync time
  await db.state.put({ key: 'lastSyncTime', value: Date.now() })
}
