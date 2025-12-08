import { ItemInfoType } from '../types'

export interface ProviderItemInfoType extends ItemInfoType {
  id: string
  groupId: string
  content: string | null
}

export interface BaseProviderType {
  open(): Promise<void>
  close(): Promise<void>
  isReady(): Promise<boolean>
  fetchGroupList(): Promise<any[]>
  fetchItemList(groupId: string): Promise<ItemInfoType[]>
  fetchItemInfo(key: string): Promise<ProviderItemInfoType | null>
  downloadFile(key: string): Promise<ArrayBuffer | null>
  uploadFile(item: ItemInfoType, groupId: string, data: ArrayBuffer): Promise<boolean>
  deleteFile(item: ItemInfoType, groupId: string): Promise<boolean>
}
