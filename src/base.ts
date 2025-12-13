import { GroupInfoType, ItemInfoType } from './types'

export interface ProviderItemInfoType extends ItemInfoType {
  id: string
  groupId: string
  content: string | null
}

export interface BaseProviderType {
  web(): Electron.WebContents
  open(): Promise<void>
  close(): Promise<void>
  login(options: any): Promise<boolean>
  logout(): Promise<boolean>
  isReady(): Promise<boolean>
  fetchGroupList(): Promise<GroupInfoType[]>
  fetchItemList(): Promise<ItemInfoType[]>
  fetchItemInfo(key: string): Promise<ProviderItemInfoType | null>
  downloadFile(key: string): Promise<ArrayBuffer | null>
  uploadFile(item: ItemInfoType, data: ArrayBuffer): Promise<boolean>
  deleteFile(item: ItemInfoType): Promise<boolean>
}
