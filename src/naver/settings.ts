import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian'
import NaverSyncPlugin from './main'
import { NaverProvider } from './provider'

export interface NaverSyncPluginSettings {
  folderName: string
}

export class NaverSettingTab extends PluginSettingTab {
  plugin: NaverSyncPlugin
  provider: ReturnType<typeof NaverProvider> = NaverProvider()
  groupList: Record<string, string> = {
    '내 메모': '내 메모',
  }

  constructor(app: App, plugin: NaverSyncPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  displayLoginSetting() {
    const state = {
      id: '',
      password: '',
      oneTime: '',
      idInput: null as TextComponent | null,
      pwInput: null as TextComponent | null,
      oneTimeInput: null as TextComponent | null,
    }

    const description = new Setting(this.containerEl).setDesc(
      '아이디와 패스워드를 저장하지 않습니다.',
    )

    new Setting(this.containerEl)
      .setName('ID')
      .addText((text) => {
        state.idInput = text
        return text.setPlaceholder('Naver ID').onChange((value) => (state.id = value))
      })
      .addText((text) => {
        state.pwInput = text
        text.inputEl.type = 'password'

        return text.setPlaceholder('Naver Password').onChange((value) => (state.password = value))
      })
      .addButton((button) => {
        button.setButtonText('Login').onClick(async () => {
          state.idInput?.setDisabled(true)
          state.pwInput?.setDisabled(true)
          button.setButtonText('Logging in...')
          button.setDisabled(true)
          const success = await this.provider
            .login({ id: state.id, password: state.password })
            .catch(() => false)
          if (success) {
            this.display()
          } else {
            description.setDesc('로그인에 실패했습니다. 아이디와 패스워드를 확인해주세요.')
            state.idInput?.setDisabled(false)
            state.pwInput?.setDisabled(false)
            button.setButtonText('Login')
            button.setDisabled(false)
          }
        })
      })

    new Setting(this.containerEl)
      .setName('일회용 번호')
      .setDesc(
        '네이버앱의 메뉴 > 설정 > 로그인 아이디 관리 > 더보기 > 일회용 로그인 번호에 보이는 번호를 입력해 주세요.',
      )
      .addText((text) => {
        state.oneTimeInput = text
        return text
          .setPlaceholder('번호를 입력하세요.')
          .onChange((value) => (state.oneTime = value))
      })
      .addButton((button) => {
        button.setButtonText('Login').onClick(async () => {
          state.oneTimeInput?.setDisabled(true)
          button.setButtonText('Logging in...')
          button.setDisabled(true)
          const success = await this.provider.login({ oneTime: state.oneTime }).catch(() => false)
          if (success) {
            this.display()
          } else {
            description.setDesc('일회용 로그인 번호를 확인한 후 다시 입력해 주세요.')
            state.oneTimeInput?.setValue('')
            state.oneTimeInput?.setDisabled(false)
            button.setButtonText('Login')
            button.setDisabled(false)
          }
        })
      })
  }

  displayLogoutSetting() {
    new Setting(this.containerEl).setName('Logged in Naver').addButton((button) => {
      button.setButtonText('Logout').onClick(async () => {
        await this.provider.logout()
        this.display()
      })
    })
  }

  refresh() {
    this.display()
  }

  async display() {
    this.containerEl.empty()

    this.containerEl.createEl('h3', { text: 'Naver Sync Settings' })

    await this.provider.open()
    const ready = await this.provider.isReady().catch(() => false)
    if (ready) {
      const groupList = await this.provider.fetchGroupList()
      this.provider.close()
      this.groupList = {}
      groupList.forEach((group) => {
        this.groupList[group.name] = group.name
      })
      this.displayLogoutSetting()
    } else {
      const selectedFolderName = this.plugin.settings.folderName
      this.groupList[selectedFolderName] = selectedFolderName
      this.displayLoginSetting()
    }

    new Setting(this.containerEl)
      .setName('폴더 이름')
      .setDesc('동기화할 Naver 메모 폴더 이름을 설정합니다.')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(this.groupList)
          .setValue(this.plugin.settings.folderName)
          .onChange(async (value) => {
            this.plugin.settings.folderName = value
            await this.plugin.saveSettings()
          }),
      )
  }

  hide(): void {
    this.provider.close()
  }
}
