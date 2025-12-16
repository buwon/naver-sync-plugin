import { Notice, TFile, Vault } from 'obsidian'
import { db } from './database'
import { syncState } from './syncState'
import { EventEmitter } from 'eventemitter3'
import { createNaverMobileProvider } from './naver/mobileProvider'
import { createNaverDesktopProvider } from './naver/desktopProvider'
import { createRemote } from './remote'
import { sync } from './sync'

function getFileInfo(file: TFile) {
  return {
    key: file.path,
    cTime: file.stat.ctime,
    mTime: file.stat.mtime,
    size: file.stat.size,
  }
}

export const event = new EventEmitter()

event.on('create', async (file: TFile) => {
  if (syncState.lockFile.has(file.path)) return

  if (file instanceof TFile) {
    const item = {
      status: 'C',
      ...getFileInfo(file),
    }

    db.file.put(item)

    console.log('File created:', file)
  }
})

event.on('modify', async (file: TFile) => {
  if (syncState.lockFile.has(file.path)) return

  if (file instanceof TFile) {
    const item = {
      status: 'U',
      ...getFileInfo(file),
    }

    db.file.put(item)
  }
  console.log('File modified:', file)
})

event.on('delete', async (file: TFile) => {
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
})

event.on('rename', async (file: TFile, oldPath: string) => {
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
})

event.on('sync', async (settings, vault: Vault) => {
  if ('no' === settings.loggedIn) {
    new Notice('Please log in to Naver before syncing.')
    return
  }

  let provider

  if ('mobile' === settings.loggedIn) {
    const mobileProvider = createNaverMobileProvider()
    mobileProvider.setCookie(settings.NID_AUT, settings.NID_SES)
    provider = mobileProvider
  } else {
    const desktopProvider = createNaverDesktopProvider()
    provider = desktopProvider
  }

  try {
    const startTime = Date.now()
    await provider.open()
    const ready = await provider.isReady()
    if (!ready) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.')
    }

    const groupList = await provider.fetchGroupList()
    const group = groupList.filter((group) => group.name === settings.folderName)
    if (group.length === 0) {
      throw new Error('지정한 폴더를 찾을 수 없습니다.')
    }
    provider.setGroupId(group[0].id)
    const remote = createRemote(provider)
    await sync(vault, remote)
    console.log('Sync completed in', Date.now() - startTime, 'ms')
  } catch (e) {
    if (e instanceof Error) {
      console.log('Sync error:', e)
    }
    new Notice(e.message)
    return
  } finally {
    await provider.close()
  }
})
