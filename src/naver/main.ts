import { Notice, Plugin, TFile } from 'obsidian'
import { event } from '../event'
import { NaverSettingTab, NaverSyncPluginSettings } from './settings'
import { sync } from '../sync'
import { createRemote } from '../remote'
import { createNaverMobileProvider } from './mobileProvider'
import { createNaverDesktopProvider } from './desktopProvider'
import { db } from '../database'

const local = {
  lastModifiedTime: 0,
}

export default class NaverSyncPlugin extends Plugin {
  settings: NaverSyncPluginSettings

  async isIntervalSyncTime() {
    const settings = this.settings
    if (0 === settings.syncInterval) return false

    const state = await db.state.get('lastSyncTime')
    const lastSyncTime = state?.value ?? 0

    return Date.now() - lastSyncTime >= settings.syncInterval
  }

  isModifiedSyncTime() {
    const settings = this.settings

    if (0 === settings.onSaveInterval) return false
    if (0 === local.lastModifiedTime) return false

    return Date.now() - local.lastModifiedTime >= settings.onSaveInterval
  }

  async checkSync() {
    if (await this.isIntervalSyncTime()) {
      local.lastModifiedTime = 0
      await this.sync()
      return
    }

    if (this.isModifiedSyncTime()) {
      local.lastModifiedTime = 0
      await this.sync()
      return
    }
  }

  async sync() {
    const settings = this.settings
    const vault = this.app.vault
    let provider

    if ('no' === settings.loggedIn) {
      new Notice('Please log in to naver before syncing.')
      return
    } else if ('mobile' === settings.loggedIn) {
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
        new Notice('Naver session has expired. Please log in again.')
        return
      }

      const groupList = await provider.fetchGroupList()
      const group = groupList.filter((group) => group.name === settings.folderName)
      if (group.length === 0) {
        new Notice('Could not find the specified folder. Please check your settings.')
        return
      }
      provider.setGroupId(group[0].id)
      const remote = createRemote(provider)
      await sync(vault, remote, this.app.fileManager)
      console.debug('Sync completed in', Date.now() - startTime, 'ms')
    } catch (e) {
      if (e instanceof Error) {
        console.error('Sync error:', e)
      }
      new Notice(e.message)
      return
    } finally {
      void provider.close()
    }
  }

  async onload() {
    await this.loadSettings()

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('refresh-ccw-dot', 'Sync with naver', (_evt: MouseEvent) => {
      void this.sync()
    })

    this.addCommand({
      id: 'sync-naver',
      name: 'Start sync',
      callback: () => void this.sync(),
    })

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new NaverSettingTab(this.app, this))

    this.app.workspace.onLayoutReady(() => {
      local.lastModifiedTime = 0

      this.registerEvent(
        this.app.vault.on('create', (file: TFile) => {
          event.emit('create', file)
          local.lastModifiedTime = Date.now()
        }),
      )

      this.registerEvent(
        this.app.vault.on('modify', (file: TFile) => {
          event.emit('modify', file)
          local.lastModifiedTime = Date.now()
        }),
      )

      this.registerEvent(
        this.app.vault.on('delete', (file: TFile) => {
          event.emit('delete', file)
          local.lastModifiedTime = Date.now()
        }),
      )
      this.registerEvent(
        this.app.vault.on('rename', (file: TFile, oldPath: string) => {
          event.emit('rename', file, oldPath)
          local.lastModifiedTime = Date.now()
        }),
      )

      event.on('saveSettings', (params: Record<string, string | number>) => {
        this.settings = Object.assign({}, this.settings, params)
        void this.saveData(this.settings)
      })

      // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
      this.registerInterval(window.setInterval(() => void this.checkSync(), 10 * 1000))

      console.debug('NaverSyncPlugin loaded')
    })
  }

  onunload() {
    event.off('saveSettings')

    console.debug('NaverSyncPlugin unloaded')
  }

  async loadSettings() {
    const DEFAULT_SETTINGS: NaverSyncPluginSettings = {
      loggedIn: 'no',
      folderName: '내 메모',
      NID_AUT: '',
      NID_SES: '',
      syncInterval: 0,
      onSaveInterval: 0,
    }

    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
