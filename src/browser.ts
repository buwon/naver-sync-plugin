import { remote } from 'electron'

export class Browser {
  browserWindow = null as Electron.BrowserWindow | null

  get browser(): Electron.BrowserWindow {
    if (!this.browserWindow) {
      this.browserWindow = this.browserWindow
        ? this.browserWindow
        : new remote.BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
            },
          })
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
      this.webContents.once('did-finish-load', resolve)
      this.webContents.loadURL(url).catch(reject)
    })
  }

  fetch(url: string, options: any): Promise<any> {
    return this.webContents.executeJavaScript(`
			fetch("${url}" , {
			method: '${options.method}',
			headers: {
				"Userid": window.USER_ID,
			},
			body: new URLSearchParams(${JSON.stringify(options.body)}),
			}).then(response => response.json())
		`)
  }
}
