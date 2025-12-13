import { remote } from 'electron'
import { Notice } from 'obsidian'
import { Browser } from 'src/browser'
import { GroupInfoType, ItemInfoType } from 'src/types'
import { BaseProviderType, ProviderItemInfoType } from '../base'

interface NaverFolderType {
  folderName: string
  folderType: number
  colorId: number
  sortOrder: number
  folderId: number
  name: string
  isRepresent: boolean
  isDelete: boolean
  memoCount: number
  lock: boolean
  createdTime: number
  lastModifiedTime: number
  serverRegisterMillis: number
  serverModifyMillis: number
  changerDeviceNo: number
  defaultFolder: boolean
  isDefaultFolder: boolean
  cuttedFolderName: string
}

interface NaverFolderListResponseType {
  code: 'FAIL' | 'SUCCESS'
  message: string
  data: {
    folderList: NaverFolderType[]
  }
}

interface NaverMemoListType {
  memoSeq: number
  title: string
  lastModifiedTime: number
  serverLastModifiedTime: number
  folderId: number
  memoPlainContent: string

  memberId: string
  content: string
  shortVersion: boolean
  images: any[]
  createdTime: number
  clientType: string
  colorId: number
  todo: boolean
  deleted: boolean
  restorable: boolean
  important: boolean
  editorVersion: number
  serverCreatedTime: number
  serverMetaTime: number
  changerDeviceNo: number
  pinTime: number
  lock: boolean
  modifyDate: string
  memoContent: string
  registerDate: string
  imgList: any[]
  clientTypeCode: number
  registDate: string
  lastModifyDate: string
  imageList: any[]
  audioList: any[]
  openGraphList: any[]
  existsAudio: boolean
  comments: any[]
}

interface NaverMemoListResponseType {
  code: 'FAIL' | 'SUCCESS'
  message: string
  data: {
    memoList: NaverMemoListType[]
    nextCursor: string
    totalCount: number
  }
}

interface NaverMemoType {
  memberId: string
  memoSeq: number
  folderId: number
  title: string
  content: string
  memoPlainContent: string
  shortVersion: boolean
  images: any[]
  createdTime: number
  lastModifiedTime: number
  clientType: string
  colorId: number
  todo: boolean
  deleted: boolean
  restorable: boolean
  important: boolean
  editorVersion: number
  serverCreatedTime: number
  serverLastModifiedTime: number
  serverMetaTime: number
  changerDeviceNo: number
  pinTime: number
  lock: boolean
  modifyDate: string
  memoContent: string
  registerDate: string
  imgList: any[]
  clientTypeCode: number
  registDate: string
  lastModifyDate: string
  imageList: any[]
  audioList: any[]
  openGraphList: any[]
  existsAudio: boolean
  comments: any[]
}

interface NaverMemoResponseType {
  code: 'FAIL' | 'SUCCESS'
  message: string
  data: NaverMemoType
}

export const NaverProvider = (): BaseProviderType & { setGroupId(groupId: string): void } => {
  const state = {
    browser: new Browser(),
    groupId: 0 as number,
    memos: {} as Record<string, ProviderItemInfoType>,
  }

  function web() {
    return state.browser.webContents
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

  async function open(): Promise<void> {
    await state.browser.loadURL('https://memo.naver.com/')
  }

  async function close() {
    state.browser.close()
  }

  async function login(options = {}) {
    const { id, password, oneTime } = options as {
      id?: string
      password?: string
      oneTime?: string
    }

    if (id && password) {
      const url =
        'https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com%2F'
      await state.browser.loadURL(url)

      await state.browser.executeMoveScript(`
async function typeText(element, text, delayMs = 100) {
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

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
    `)
    } else if (oneTime) {
      const url =
        'https://nid.naver.com/nidlogin.login?mode=number&url=https%3A%2F%2Fwww.naver.com%2F&locale=ko_KR&svctype=1'
      await state.browser.loadURL(url)

      await state.browser.executeMoveScript(`
async function typeText(element, text, delayMs = 100) {
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

const disposableInput = document.getElementById('disposable');
Promise.resolve()
  .then(async () => {
    await typeText(disposableInput, '${oneTime}', 100);
  })
  .then(() => {
    document.getElementById('frmNIDLogin').submit();
  });
    `)
    }

    const isReady = await this.isReady().catch(() => false)
    return isReady
  }

  async function logout() {
    const url = 'https://nid.naver.com/nidlogin.logout?returl=https://www.naver.com'
    await state.browser.loadURL(url)

    return true
  }

  async function isReady(): Promise<boolean> {
    const url = state.browser.webContents.getURL()
    if (url.includes('login')) {
      throw new Error('Naver not logged in')
    }

    return true
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
    let memoList = [] as NaverMemoListType[]
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
    isReady,
    setGroupId(groupId: string) {
      state.groupId = parseInt(groupId)
    },
    fetchGroupList,
    fetchItemList,
    fetchItemInfo,
    downloadFile,
    uploadFile,
    deleteFile,
  }
}
