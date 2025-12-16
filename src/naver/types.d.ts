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

interface NaverMemoListResponseType {
  code: 'FAIL' | 'SUCCESS'
  message: string
  data: {
    memoList: NaverMemoType[]
    nextCursor: string
    totalCount: number
  }
}

interface NaverMemoResponseType {
  code: 'FAIL' | 'SUCCESS'
  message: string
  data: NaverMemoType
}
