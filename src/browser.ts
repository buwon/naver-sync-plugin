import { remote } from 'electron'

export class Browser {
  browserWindow = null as Electron.BrowserWindow | null

  get browser(): Electron.BrowserWindow {
    if (!this.browserWindow) {
      const browserWindow = new remote.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })
      browserWindow.once('close', () => {
        this.browserWindow = null
      })

      this.browserWindow = browserWindow
    }

    return this.browserWindow as Electron.BrowserWindow
  }

  get webContents(): Electron.WebContents {
    return this.browser.webContents
  }

  close(): void {
    if (this.browserWindow) {
      this.browserWindow.close()
      this.browserWindow = null
    }
  }

  async loadURL(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('loadURL timeout'))
      }, 5000)

      this.webContents.once('did-finish-load', () => {
        clearTimeout(timeoutId)
        resolve()
      })
      this.webContents.once('did-finish-load', resolve)
      this.webContents.loadURL(url).catch(reject)
    })
  }

  async executeMoveScript(script: string, wait: number = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webContents
        .executeJavaScript(script)
        .then(() => setTimeout(resolve, wait))
        .catch(reject)
    })
  }
}
