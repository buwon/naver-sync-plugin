import { Browser } from '../browser'
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
  browser: Browser = new Browser()

  web() {
    return this.browser.webContents
  }

  protected override async fetch<T>(url: string, options: any): Promise<T> {
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

  async open(): Promise<boolean> {
    await this.browser.loadURL('https://memo.naver.com/')
    return true
  }

  async close(): Promise<boolean> {
    try {
      this.browser.close()
    } catch {}

    return true
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

  async isReady(): Promise<boolean> {
    const url = this.browser.webContents.getURL()
    if (url.includes('login')) {
      return false
    }

    return true
  }
}

export function createNaverDesktopProvider() {
  return new NaverDesktopProvider()
}

/*
export interface NaverDesktopProviderType extends BaseProviderType {
  web(): Electron.WebContents
  open(): Promise<void>
  close(): Promise<void>
  login(options: any): Promise<boolean>
  logout(): Promise<boolean>
  setGroupId(groupId: string): void
}

export const NaverDesktopProvider2 = (): NaverDesktopProviderType => {
  const state = {
    browser: new Browser(),
    groupId: 0 as number,
    memos: {} as Record<string, ProviderItemInfoType>,
  }

  async function fetch(url: string, options: any): Promise<any> {
    return state.browser.webContents.executeJavaScript(`
			fetch(window.location.origin + "${url}" , {
			method: '${options.method}',
			headers: {
				"Userid": window.USER_ID,
			},
			body: new URLSearchParams(${JSON.stringify(options.body)}),
			}).then(response => response.json())
		`)
  }

  function setGroupId(groupId: string) {
    state.groupId = parseInt(groupId)
  }

  async function fetchGroupList(): Promise<GroupInfoType[]> {
    const url = '/folder/folderList'
    const resp: NaverFolderListResponseType = await fetch(url, {
      method: 'POST',
      body: {},
    })
    const groupList: GroupInfoType[] = resp.data.folderList.map((folder) => ({
      id: folder.folderId.toString(),
      name: folder.folderName,
    }))

    return groupList
  }

  async function fetchMemoList(cursor: string): Promise<NaverMemoListResponseType> {
    const url = '/api/memo/select/list'
    const resp: NaverMemoListResponseType = await fetch(url, {
      method: 'POST',
      body: {
        folderId: `${state.groupId}`,
        cursor: cursor,
        sizePerPage: '40',
        contentLength: '1000',
        sortCode: 'PIN_DESC_MODIFIED_TIME_DESC',
        startTime: '0',
        endTime: '0',
        includeDeletedMemo: 'false',
        excludeHtml: 'true',
      },
    })

    return resp
  }

  async function fetchItemList(): Promise<ItemInfoType[]> {
    let finished = false
    let cursor = ''
    let memoList = [] as NaverMemoType[]
    while (!finished) {
      const resp = await fetchMemoList(cursor)
      if ('FAIL' === resp.code) {
        throw new Error(`Failed to fetch memo list: ${resp.message}`)
      }
      const totalCount = resp.data.totalCount
      cursor = resp.data.nextCursor
      memoList = memoList.concat(resp.data.memoList)
      if (memoList.length >= totalCount || !cursor) {
        finished = true
      }
    }
    const itemList: ItemInfoType[] = memoList
      .map((memo) => {
        if (!memo.title.includes('.')) return null

        const memoPlainContent = memo.memoPlainContent
        if (memoPlainContent && memoPlainContent.split(';').length >= 4) {
          const key = memo.title
          const plainContent = memo.memoPlainContent.split(';')
          const mTime = parseInt(plainContent[0])
          const cTime = parseInt(plainContent[1])
          const status = plainContent[2]
          const size = parseInt(plainContent[3])
          const content = plainContent.length > 5 ? plainContent[4] : null

          state.memos[key] = {
            id: `${memo.memoSeq}`,
            groupId: `${memo.folderId}`,
            key,
            cTime: cTime,
            mTime: mTime,
            size: size,
            status,
            content,
          }

          return { key, cTime, mTime, size, status }
        }

        const key = memo.title
        const cTime = memo.createdTime
        const mTime = memo.lastModifiedTime
        const size = 0
        const status = 'N'

        state.memos[key] = {
          id: `${memo.memoSeq}`,
          groupId: `${memo.folderId}`,
          key,
          cTime,
          mTime,
          size,
          status,
          content: '',
        }
        return { key, cTime, mTime, size, status }
      })
      .filter((item): item is ItemInfoType => item !== null)

    return itemList
  }

  async function fetchItemInfo(key: string): Promise<ProviderItemInfoType | null> {
    const memo = state.memos[key]
    if (memo) {
      if (null === memo.content) {
        const url = `/api/memo/select`
        const resp: NaverMemoResponseType = await fetch(url, {
          method: 'POST',
          body: {
            memoSeq: memo.id,
          },
        })
        const [, , , , content] = resp.data.memoPlainContent.split(';')
        memo.content = content
      }
      return memo
    }
    return null
  }

  async function downloadFile(key: string): Promise<ArrayBuffer | null> {
    const item = await fetchItemInfo(key)

    if (item?.content) {
      return Buffer.from(item.content, 'base64').buffer
    }

    return null
  }

  async function createMemo(item: ItemInfoType): Promise<ProviderItemInfoType> {
    const url = '/memo/writeMemo'
    const { data }: NaverMemoResponseType = await fetch(url, {
      method: 'POST',
      body: {
        title: item.key,
        memoContent: `${item.mTime};${item.cTime};N;${item.size};;`,
        important: false,
        colorId: 0,
        folderId: state.groupId,
        editorVersion: 1,
      },
    })

    return {
      id: `${data.memoSeq}`,
      groupId: `${data.folderId}`,
      key: item.key,
      cTime: item.cTime,
      mTime: item.mTime,
      size: item.size,
      status: 'N',
      content: null,
    }
  }

  async function uploadFile(item: ItemInfoType, data: ArrayBuffer): Promise<boolean> {
    if (!state.memos[item.key]) {
      state.memos[item.key] = await createMemo(item)
    }

    const memo = state.memos[item.key]
    const content = Buffer.from(data).toString('base64')
    const memoContent = `${item.mTime};${item.cTime};N;${item.size};${content};`

    // update
    const url = '/memo/updateMemo'
    const resp = await fetch(url, {
      method: 'POST',
      body: {
        memoSeq: parseInt(memo.id),
        title: item.key,
        memoContent: memoContent,
        important: false,
        colorId: 0,
        folderId: parseInt(memo.groupId),
        editorVersion: 1,
        pinTime: 0,
      },
    })

    return 'SUCCESS' === resp.code
  }

  async function deleteFile(item: ItemInfoType): Promise<boolean> {
    if (!state.memos[item.key]) {
      state.memos[item.key] = await createMemo(item)
    }

    const memo = state.memos[item.key]
    const memoContent = `${item.mTime};${item.cTime};D;${item.size};;`
    const url = '/memo/updateMemo'
    const resp = await fetch(url, {
      method: 'POST',
      body: {
        memoSeq: parseInt(memo.id),
        title: item.key,
        memoContent,
        important: false,
        colorId: 0,
        folderId: parseInt(memo.groupId),
        editorVersion: 1,
        pinTime: 0,
      },
    })

    return 'SUCCESS' === resp.code
  }

  return {
    web,
    open,
    close,
    login,
    logout,
    setGroupId,
    isReady,
    fetchGroupList,
    fetchItemList,
    fetchItemInfo,
    downloadFile,
    uploadFile,
    deleteFile,
  }
}
*/
