import {
  App,
  ButtonComponent,
  PluginSettingTab,
  Setting,
  TextComponent,
  Platform,
  Notice,
} from 'obsidian'
import NaverSyncPlugin from './main'
import { createNaverDesktopProvider, NaverDesktopProvider } from './desktopProvider'
import { createNaverMobileProvider, NaverMobileProvider } from './mobileProvider'
import { event } from '../event'

export interface NaverSyncPluginSettings {
  loggedIn: string
  folderName: string
  NID_AUT: string
  NID_SES: string
  syncInterval: number
  onSaveInterval: number
}

export class NaverSettingTab extends PluginSettingTab {
  plugin: NaverSyncPlugin
  desktopProvider: NaverDesktopProvider | null = null
  mobileProvider: NaverMobileProvider
  groupList: Record<string, string> = {
    '내 메모': '내 메모',
  }
  mode: 'desktop' | 'mobile' | null = null
  state = {
    id: '',
    password: '',
    captcha: '',
    oneTime: '',
    idInput: null as TextComponent | null,
    pwInput: null as TextComponent | null,
    oneTimeInput: null as TextComponent | null,
    loginButton: null as ButtonComponent | null,
    description: null as Setting | null,
    captchaDiv: null as HTMLElement | null,
    captchaInput: null as TextComponent | null,
  }

  constructor(app: App, plugin: NaverSyncPlugin) {
    super(app, plugin)
    this.plugin = plugin

    if (Platform.isDesktopApp) {
      this.desktopProvider = createNaverDesktopProvider()
    }

    this.mobileProvider = createNaverMobileProvider()
  }

  setLoggedInNaver(mode: 'desktop' | 'mobile' | 'no') {
    if (this.plugin.settings.loggedIn === mode) {
      return
    }

    this.plugin.settings.loggedIn = mode
    event.emit('saveSettings', { loggedIn: mode })
  }

  async isLoggedInNaver() {
    if (this.desktopProvider) {
      const desktopProvider = this.desktopProvider
      await desktopProvider.open()
      const success = await desktopProvider.isReady()
      if (success) {
        this.setLoggedInNaver('desktop')

        this.desktopProvider = desktopProvider
        return true
      }
    }

    const NID_AUT = this.plugin.settings.NID_AUT
    const NID_SES = this.plugin.settings.NID_SES
    if (NID_AUT && NID_SES) {
      this.mobileProvider.setCookie(NID_AUT, NID_SES)

      const success = await this.mobileProvider.isReady()
      if (success) {
        this.setLoggedInNaver('mobile')
        return true
      }
    }

    this.setLoggedInNaver('no')
    return false
  }

  async fetchGroupList() {
    if (this.plugin.settings.loggedIn === 'desktop') {
      const desktopProvider = this.desktopProvider
      if (desktopProvider) {
        const groupList = await desktopProvider.fetchGroupList()
        await desktopProvider.close()
        return groupList
      }
    }

    if (this.plugin.settings.loggedIn === 'mobile') {
      const groupList = await this.mobileProvider.fetchGroupList()
      return groupList
    }

    return []
  }

  async onClickPasswordLogin() {
    const desktopProvider = this.desktopProvider
    if (!desktopProvider) {
      return false
    }
    this.state.idInput?.setDisabled(true)
    this.state.pwInput?.setDisabled(true)
    this.state.captchaInput?.setDisabled(true)
    this.state.loginButton?.setButtonText('Logging in...')
    this.state.loginButton?.setDisabled(true)
    const success = await desktopProvider
      .login({ id: this.state.id, password: this.state.password, captcha: this.state.captcha })
      .catch(() => false)

    this.state.idInput?.setDisabled(false)
    this.state.pwInput?.setDisabled(false)
    this.state.pwInput?.setValue('')
    this.state.captchaInput?.setDisabled(false)
    this.state.loginButton?.setButtonText('Login')
    this.state.loginButton?.setDisabled(false)

    if (success) {
      await this.display()
    } else {
      const captchaSrc = await desktopProvider
        .web()
        .executeJavaScript<string>('document.querySelector("img#captchaimg").src')
      if (captchaSrc) {
        await this.displayCaptcha(captchaSrc)
      } else {
        this.state.description?.setDesc('로그인에 실패했습니다. 아이디와 패스워드를 확인해주세요.')
      }
    }

    return success
  }

  async onClickOneTimeLogin() {
    const desktopProvider = this.desktopProvider
    if (!desktopProvider) {
      return false
    }

    return await desktopProvider.login({ oneTime: this.state.oneTime }).catch(() => false)
  }

  displayDesktopLoginSetting() {
    if (Platform.isMobileApp) {
      return
    }

    new Setting(this.containerEl).setDesc('플러그인은 패스워드를 저장하지 않습니다.')

    // 패스워드 로그인 섹션
    new Setting(this.containerEl).setName('Password').setHeading()

    this.state.description = new Setting(this.containerEl)
      .setName('ID')
      .addText((text) => {
        this.state.idInput = text
        return text.setPlaceholder('ID').onChange((value) => (this.state.id = value))
      })
      .addText((text) => {
        this.state.pwInput = text
        text.inputEl.type = 'password'

        text.inputEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void this.onClickPasswordLogin()
          }
        })

        return text.setPlaceholder('Password').onChange((value) => (this.state.password = value))
      })
      .addButton((button) => {
        this.state.loginButton = button
        button.setButtonText('Login').onClick(() => this.onClickPasswordLogin())
      })

    this.state.captchaDiv = this.containerEl.createEl('div')

    new Setting(this.containerEl).setName('One-time number').setHeading()

    new Setting(this.containerEl)
      .setName('일회용 번호')
      .setDesc(
        '네이버앱의 메뉴 > 설정 > 로그인 아이디 관리 > 더보기 > 일회용 로그인 번호에 보이는 번호를 입력해 주세요.',
      )
      .addText((text) => {
        this.state.oneTimeInput = text
        return text
          .setPlaceholder('번호를 입력하세요.')
          .onChange((value) => (this.state.oneTime = value))
      })
      .addButton((button) => {
        button.setButtonText('Login').onClick(async () => {
          this.state.oneTimeInput?.setDisabled(true)
          button.setButtonText('Logging in...')
          button.setDisabled(true)
          const success = await this.onClickOneTimeLogin()
          if (success) {
            await this.display()
          } else {
            this.state.description?.setDesc('일회용 로그인 번호를 확인한 후 다시 입력해 주세요.')
            this.state.oneTimeInput?.setValue('')
            this.state.oneTimeInput?.setDisabled(false)
            button.setButtonText('Login')
            button.setDisabled(false)
          }
        })
      })
  }

  displayMobileLoginSetting() {
    // 쿠키 로그인 섹션
    new Setting(this.containerEl).setName('Cookie login').setHeading()

    new Setting(this.containerEl).setName('NID_AUT').addText((text) => {
      return text
        .setPlaceholder('NID_AUT')
        .setValue(this.plugin.settings.NID_AUT)
        .onChange((value) => {
          this.plugin.settings.NID_AUT = value
          event.emit('saveSettings', { NID_AUT: value })
        })
    })

    new Setting(this.containerEl).setName('NID_SES').addText((text) => {
      return text
        .setPlaceholder('NID_SES')
        .setValue(this.plugin.settings.NID_SES)
        .onChange((value) => {
          this.plugin.settings.NID_SES = value
          event.emit('saveSettings', { NID_SES: value })
        })
    })

    new Setting(this.containerEl)
      .setName('쿠키 로그인')
      .setDesc('데스크탑의 개발자 도구에서 쿠키 값을 복사해 입력하세요.')
      .addButton((button) => {
        button.setButtonText('Login').onClick(async () => {
          button.setButtonText('Logging in...')
          button.setDisabled(true)
          this.mobileProvider.setCookie(this.plugin.settings.NID_AUT, this.plugin.settings.NID_SES)
          const success = await this.mobileProvider.isReady()
          if (success) {
            void this.display()
          } else {
            new Notice('쿠키 로그인에 실패했습니다. 쿠키 값을 확인해 주세요.')
            button.setButtonText('Login')
            button.setDisabled(false)
          }
        })
      })
  }

  displayLogoutSetting() {
    new Setting(this.containerEl).setName('Logged in naver').addButton((button) => {
      button.setButtonText('Logout').onClick(async () => {
        if (this.desktopProvider) {
          await this.desktopProvider.logout()
        }
        event.emit('saveSettings', { loggedIn: 'no', NID_AUT: '', NID_SES: '' })
        void this.display()
      })
    })
  }

  async displayCaptcha(captchaSrc: string) {
    if (this.state.captchaDiv && this.desktopProvider) {
      this.state.captchaDiv.empty()
      this.state.captchaDiv.createEl('img', { attr: { src: captchaSrc } })
      const info = await this.desktopProvider
        .web()
        .executeJavaScript<string>('document.querySelector("p#captcha_info").innerText')

      new Setting(this.state.captchaDiv).setName(info).addText((text) => {
        this.state.captchaInput = text
        text.inputEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void this.onClickPasswordLogin()
          }
        })
        return text
          .setPlaceholder('정답을 입력해 주세요.')
          .onChange((value) => (this.state.captcha = value))
      })
    }
  }

  clear() {
    this.containerEl.empty()
    this.state.id = ''
    this.state.password = ''
    this.state.oneTime = ''
  }

  async displayAsync() {
    this.clear()

    new Setting(this.containerEl).setName('Naver session').setHeading()

    const ready = await this.isLoggedInNaver()
    if (ready) {
      event.emit('status', 'check')
      const groupList = await this.fetchGroupList()
      this.groupList = {}
      groupList.forEach((group) => {
        this.groupList[group.name] = group.name
      })
      this.displayLogoutSetting()
    } else {
      event.emit('status', 'alert')
      const selectedFolderName = this.plugin.settings.folderName
      this.groupList = { [selectedFolderName]: selectedFolderName }
      this.displayDesktopLoginSetting()
      this.displayMobileLoginSetting()
    }

    new Setting(this.containerEl).setName('Sync options').setHeading()

    new Setting(this.containerEl)
      .setName('폴더 이름')
      .setDesc('동기화할 네이버 메모 폴더 이름을 설정합니다.')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(this.groupList)
          .setValue(this.plugin.settings.folderName)
          .onChange(async (value) => {
            this.plugin.settings.folderName = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(this.containerEl)
      .setName('Schedule for auto run')
      .setDesc('The plugin tries to schedule the running after every interval.')
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            0: '(not set)',
            300000: 'Every 5 minutes',
            600000: 'Every 10 minutes',
            1800000: 'Every 30 minutes',
            3600000: 'Every 1 hour',
          })
          .setValue(this.plugin.settings.syncInterval.toString())
          .onChange((value) => {
            const interval = parseInt(value)
            event.emit('saveSettings', { syncInterval: interval })
          })
      })

    new Setting(this.containerEl)
      .setName('Sync on save')
      .setDesc('If you change your files, the plugin tries to sync after this time')
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            0: '(not set)',
            60000: 'Every 1 minutes',
            180000: 'Every 3 minutes',
            300000: 'Every 5 minutes',
            600000: 'Every 10 minutes',
          })
          .setValue(this.plugin.settings.onSaveInterval.toString())
          .onChange((value) => {
            const interval = parseInt(value)
            event.emit('saveSettings', { onSaveInterval: interval })
          })
      })
  }

  display() {
    void this.displayAsync()
  }

  hide(): void {
    if (this.desktopProvider) {
      void this.desktopProvider.close()
    }

    this.clear()
  }
}
