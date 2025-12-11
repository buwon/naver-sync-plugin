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
    return this.provider.downloadFile(key)
  }

  uploadFile(item: ItemInfoType, data: any) {
    return this.provider.uploadFile(item, data)
  }

  deleteFile(item: ItemInfoType) {
    return this.provider.deleteFile(item)
  }
}

export function createRemote(provider: BaseProviderType): Remote {
  return new Remote(provider)
}
