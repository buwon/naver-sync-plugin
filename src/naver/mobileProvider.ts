import { requestUrl, RequestUrlParam } from 'obsidian'
import { BaseProviderType } from '../base'
import { event } from '../event'

export class NaverMobileProvider implements BaseProviderType {
  userId: string | null = null
  nidAut: string | null = null
  nidSes: string | null = null
  groupId: number = 0
  memos: Record<string, ProviderItemInfoType> = {}

  setCookie(NID_AUT: string, NID_SES: string) {
    this.nidAut = NID_AUT
    this.nidSes = NID_SES
  }

  private async fetch<T>(url: string, options: any): Promise<T> {
    const body =
      options.method !== 'GET' && options.body
        ? new URLSearchParams(options.body).toString()
        : undefined

    const contentType =
      options.method !== 'GET' && options.body ? 'application/x-www-form-urlencoded' : undefined

    const request: RequestUrlParam = {
      url: `https://memo.naver.com${url}`,
      method: options.method,
      contentType,
      headers: Object.assign(
        {
          referer: 'https://memo.naver.com/',
          cookie: `NID_AUT=${this.nidAut}; NID_SES=${this.nidSes}`,
          userid: this.userId ?? '',
        },
        options.headers ?? {},
      ),
      body,
    }

    console.log('NaverMobileProvider request:', request)

    return requestUrl(request)
      .then((resp) => {
        console.log('NaverMobileProvider response:', resp)
        return resp
      })
      .then((resp) => {
        if (resp.json instanceof Error) {
          throw resp.json
        }
        return resp.json
      })
  }

  setGroupId(groupId: string): void {
    this.groupId = parseInt(groupId)
  }

  async isReady(): Promise<boolean> {
    if (!this.nidAut || !this.nidSes) {
      return false
    }

    const resp = await requestUrl({
      url: 'https://memo.naver.com',
      method: 'GET',
      headers: {
        cookie: `NID_AUT=${this.nidAut}; NID_SES=${this.nidSes}`,
      },
    })

    // Update cookies if NID_SES is refreshed
    const setCookie = resp.headers['set-cookie']
    if (setCookie && setCookie.includes('NID_SES=')) {
      setCookie.split(';').forEach((cookiePart) => {
        if (cookiePart.trim().startsWith('NID_SES=')) {
          const nidSes = cookiePart.trim().substring('NID_SES='.length)
          this.setCookie(this.nidAut!, nidSes)
          event.emit('saveSettings', { NID_SES: nidSes })
        }
      })
    }

    const mat = resp.text.match(/window.USER_ID = '(.+)';/)
    if (mat && mat.length >= 2) {
      this.userId = mat[1]
      return true
    }
    return false
  }

  async fetchGroupList(): Promise<GroupInfoType[]> {
    const url = '/folder/folderList'
    const resp: NaverFolderListResponseType = await this.fetch(url, {
      method: 'POST',
    })
    const groupList: GroupInfoType[] = resp.data.folderList.map((folder) => ({
      id: folder.folderId.toString(),
      name: folder.folderName,
    }))
    return groupList
  }

  private async fetchMemoList(cursor: string): Promise<NaverMemoListResponseType> {
    const url = '/api/memo/select/list'
    const resp: NaverMemoListResponseType = await this.fetch(url, {
      method: 'POST',
      body: {
        folderId: `${this.groupId}`,
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

  async fetchItemList(): Promise<ItemInfoType[]> {
    let finished = false
    let cursor = ''
    let memoList = [] as NaverMemoType[]
    while (!finished) {
      const resp = await this.fetchMemoList(cursor)
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

          this.memos[key] = {
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

        this.memos[key] = {
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

  async fetchItemInfo(key: string): Promise<ProviderItemInfoType | null> {
    const memo = this.memos[key]
    if (memo) {
      if (null === memo.content) {
        const url = `/api/memo/select`
        const resp: NaverMemoResponseType = await this.fetch(url, {
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

  async downloadFile(key: string): Promise<ArrayBuffer | null> {
    const item = await this.fetchItemInfo(key)
    if (item?.content) {
      return Buffer.from(item.content, 'base64').buffer
    }
    return null
  }

  private async createMemo(item: ItemInfoType): Promise<ProviderItemInfoType> {
    const url = '/memo/writeMemo'
    const { data }: NaverMemoResponseType = await this.fetch(url, {
      method: 'POST',
      body: {
        title: item.key,
        memoContent: `${item.mTime};${item.cTime};N;${item.size};;`,
        important: 'false',
        colorId: '0',
        folderId: `${this.groupId}`,
        editorVersion: '1',
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

  async uploadFile(item: ItemInfoType, data: ArrayBuffer): Promise<boolean> {
    if (!this.memos[item.key]) {
      this.memos[item.key] = await this.createMemo(item)
    }

    const memo = this.memos[item.key]
    const content = Buffer.from(data).toString('base64')
    const memoContent = `${item.mTime};${item.cTime};N;${item.size};${content};`

    const url = '/memo/updateMemo'
    const resp: NaverMemoResponseType = await this.fetch(url, {
      method: 'POST',
      body: {
        memoSeq: memo.id,
        title: item.key,
        memoContent: memoContent,
        important: 'false',
        colorId: '0',
        folderId: memo.groupId,
        editorVersion: '1',
        pinTime: '0',
      },
    })

    return 'SUCCESS' === resp.code
  }

  async deleteFile(item: ItemInfoType): Promise<boolean> {
    if (!this.memos[item.key]) {
      this.memos[item.key] = await this.createMemo(item)
    }

    const memo = this.memos[item.key]
    const memoContent = `${item.mTime};${item.cTime};D;${item.size};;`
    const url = '/memo/updateMemo'
    const resp: NaverMemoResponseType = await this.fetch(url, {
      method: 'POST',
      body: {
        memoSeq: memo.id,
        title: item.key,
        memoContent,
        important: 'false',
        colorId: '0',
        folderId: memo.groupId,
        editorVersion: '1',
        pinTime: '0',
      },
    })

    return 'SUCCESS' === resp.code
  }
}

export function createNaverMobileProvider(): NaverMobileProvider {
  return new NaverMobileProvider()
}
