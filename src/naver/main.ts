import { App, Editor, MarkdownView, Modal, Plugin, TFile, setIcon } from 'obsidian'
import { event } from '../event'
import { NaverSettingTab, NaverSyncPluginSettings } from './settings'

function eventCreate(file: TFile) {
  event.emit('create', file)
}

function eventModify(file: TFile) {
  event.emit('modify', file)
}

function eventDelete(file: TFile) {
  event.emit('delete', file)
}

function eventRename(file: TFile, oldPath: string) {
  event.emit('rename', file, oldPath)
}

export default class NaverSyncPlugin extends Plugin {
  settings: NaverSyncPluginSettings

  async onload() {
    await this.loadSettings()

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon('dice', 'Sync', (_evt: MouseEvent) => {
      // Called when the user clicks the icon.
      // new Notice('This is a notice!')
      console.log(this.app.vault.getFiles())

      const body = {
        title: 'Hello World',
        content: 'This is my first post from Obsidian plugin!',
      }

      console.log(new URLSearchParams(body).toString())
    })

    // This creates an icon in the left ribbon.
    const ribbonIconEl2 = this.addRibbonIcon('cat', 'Close', (_evt: MouseEvent) => {
      // Called when the user clicks the icon.
      // new Notice('This is a notice!')
      // closeBrowser()
    })

    // Perform additional things with the ribbon
    ribbonIconEl.addClass('my-plugin-ribbon-class')

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-sample-modal-simple',
      name: 'Open sample modal (simple)',
      callback: () => {
        new SampleModal(this.app).open()
      },
    })
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: 'sample-editor-command',
      name: 'Sample editor command',
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        console.log(editor.getSelection())
        editor.replaceSelection('Sample Editor Command')
      },
    })
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'open-sample-modal-complex',
      name: 'Open sample modal (complex)',
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app).open()
          }

          // This command will only show up in Command Palette when the check function returns true
          return true
        }
      },
    })

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      // console.log('click', evt)
    })

    this.addCommand({
      id: 'sync-naver',
      name: 'start sync',
      callback: async () => {
        event.emit('sync', this.settings, this.app.vault)
      },
    })

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem()
    statusBarItemEl.setText('Naver Sync Plugin')

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new NaverSettingTab(this.app, this))

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000))

    this.app.workspace.onLayoutReady(() => {
      this.app.vault.on('modify', eventModify)
      this.app.vault.on('create', eventCreate)
      this.app.vault.on('delete', eventDelete)
      this.app.vault.on('rename', eventRename)

      event.on('saveSettings', async (params: Record<string, any>) => {
        this.settings = Object.assign({}, this.settings, params)
        await this.saveData(this.settings)
      })

      event.on('status', (status: string) => {
        setIcon(statusBarItemEl, `cloud-${status}`)
      })
    })

    // cloud-alert
    // cloud-check
    // cloud-sync

    //
    // const resp1 = await requestUrl({
    //   url: 'https://www.naver.com',
    //   method: 'GET',
    //   headers: { cookie: `NID_AUT=${this.settings.NID_AUT}; NID_SES=${this.settings.NID_SES}` },
    // })

    // const userId = resp1.text.match(/userId: '(.+)'/)[1]
    // console.log('Naver userId:', userId)
  }

  onunload() {
    event.off('saveSettings')
    event.off('status')

    this.app.vault.off('modify', eventModify)
    this.app.vault.off('create', eventCreate)
    this.app.vault.off('delete', eventDelete)
    this.app.vault.off('rename', eventRename)

    console.log('SyncPlugin unloaded')
  }

  async loadSettings() {
    const DEFAULT_SETTINGS: NaverSyncPluginSettings = {
      loggedIn: 'no',
      folderName: '내 메모',
      NID_AUT: '',
      NID_SES: '',
    }

    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app)
  }

  onOpen() {
    const { contentEl } = this
    contentEl.setText('Woah!')
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
