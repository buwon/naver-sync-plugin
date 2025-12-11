export interface ItemInfoType {
  key: string
  status: string // 'C' | 'U' | 'D' | 'N'
  cTime: number
  mTime: number
  size: number
}

export interface GroupInfoType {
  id: string
  name: string
}
