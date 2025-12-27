import { Browser, createBrowser } from '../browser'
import { NaverMobileProvider } from './mobileProvider'

const preDefineScript = () => `
async function typeText(element, text, delayMs = 100) {
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
`

const captchaLoginScript = (password: string, captcha: string) => `
const idInput = document.getElementById('id');
const pwInput = document.getElementById('pw');
Promise.resolve()
  .then(async () => {
    await typeText(pwInput, '${password}', 100);
  })
  .then(async () => {
    if ('${captcha}' !== '') {
      const captchaInput = document.getElementById('captcha');
      await typeText(captchaInput, '${captcha}', 100);
    }
  })
  .then(() => {
    if (!document.getElementById('keep').classList.contains('check')) {
      document.getElementById('keep').click();    
    }
    document.getElementById('frmNIDLogin').submit();
  });
`

const passwordLoginScript = (id: string, password: string) => `
const idInput = document.getElementById('id');
const pwInput = document.getElementById('pw');
Promise.resolve()
  .then(async () => {
    await typeText(idInput, '${id}', 100);
  })
  .then(async () => {
    await typeText(pwInput, '${password}', 100);
  })
  .then(() => {
    if (!document.getElementById('keep').classList.contains('check')) {
      document.getElementById('keep').click();    
    }
    document.getElementById('frmNIDLogin').submit();
  });
`

const oneTimeLoginScript = (oneTime: string) => `
const disposableInput = document.getElementById('disposable');
Promise.resolve()
  .then(async () => {
    await typeText(disposableInput, '${oneTime}', 100);
  })
  .then(() => {
    document.getElementById('frmNIDLogin').submit();
  });
`

export class NaverDesktopProvider extends NaverMobileProvider {
  browser: Browser

  constructor(browser: Browser) {
    super()
    this.browser = browser
  }

  web() {
    return this.browser.webContents
  }

  protected override async fetch<T>(url: string, options: FetchOptionType): Promise<T> {
    return this.browser.webContents.executeJavaScript(`
      fetch(window.location.origin + "${url}" , {
        method: '${options.method}',
        headers: {
          "Userid": window.USER_ID,
        },
        body: new URLSearchParams(${JSON.stringify(options.body)}),
      }).then(response => response.json())
    `)
  }

  open(): Promise<boolean> {
    return this.browser.loadURL('https://memo.naver.com/').then(() => true)
  }

  close(): Promise<boolean> {
    try {
      this.browser.close()
    } catch {
      return Promise.resolve(false)
    }

    return Promise.resolve(true)
  }

  async login(options = {}) {
    const { id, password, oneTime, captcha } = options as {
      id?: string
      password?: string
      captcha?: string
      oneTime?: string
    }

    if (password && captcha && captcha.length > 0) {
      await this.browser.executeScript(preDefineScript())
      await this.browser.executeMoveScript(captchaLoginScript(password, captcha))
    } else if (id && password) {
      if (!this.browser.getURL().includes('nid.naver.com/nidlogin.login?mode=form')) {
        const url =
          'https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com%2F'
        await this.browser.loadURL(url)
      }
      await this.browser.executeScript(preDefineScript())
      await this.browser.executeMoveScript(passwordLoginScript(id, password))
    } else if (oneTime) {
      if (!this.browser.getURL().includes('nid.naver.com/nidlogin.login?mode=number')) {
        const url =
          'https://nid.naver.com/nidlogin.login?mode=number&url=https%3A%2F%2Fwww.naver.com%2F&locale=ko_KR&svctype=1'
        await this.browser.loadURL(url)
      }
      await this.browser.executeScript(preDefineScript())
      await this.browser.executeMoveScript(oneTimeLoginScript(oneTime))
    }

    const isReady = await this.isReady().catch(() => false)
    return isReady
  }

  async logout() {
    const url = 'https://nid.naver.com/nidlogin.logout?returl=https://www.naver.com'
    await this.browser.loadURL(url)

    return true
  }

  isReady(): Promise<boolean> {
    const url = this.browser.webContents.getURL()
    if (url.includes('login')) {
      return Promise.resolve(false)
    }

    return Promise.resolve(true)
  }
}

export function createNaverDesktopProvider() {
  const browser = createBrowser()
  return new NaverDesktopProvider(browser)
}
