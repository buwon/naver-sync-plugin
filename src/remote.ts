import { BaseProviderType } from './base'
import { GroupInfoType, ItemInfoType } from './types'

export class Remote {
  provider: BaseProviderType
  groups: GroupInfoType[]

  constructor(provider: BaseProviderType) {
    this.provider = provider
  }

  open() {
    return this.provider.open()
  }

  close() {
    return this.provider.close()
  }

  fetchGroupList() {
    return this.provider.fetchGroupList()
  }

  async fetchList() {
    const items = await this.provider.fetchItemList()
    return items
  }

  downloadFile(key: string) {
    console.log('Downloading file:', key)
    return this.provider.downloadFile(key)
  }

  uploadFile(item: ItemInfoType, data: any) {
    console.log('Uploading file:', item.key)
    return this.provider.uploadFile(item, data)
  }

  deleteFile(item: ItemInfoType) {
    console.log('Deleting file:', item.key)
    return this.provider.deleteFile(item)
  }
}

export function createRemote(provider: BaseProviderType): Remote {
  return new Remote(provider)
}
