export type MessageSubType =
  | 'getList'
  | 'getDetail'
  | 'setRead'
  | 'send'
  | 'deleteItem'
  | 'deleteAll'
  | 'summary'
  | 'ack'
  | 'getListResponse'
  | 'getDetailResponse'
  | 'setReadResponse'
  | 'sendResponse'
  | 'deleteItemResponse'
  | 'deleteAllResponse'

export type StationSubType =
  | 'getListRange'
  | 'getCurrent'
  | 'setCurrent'
  | 'next'
  | 'prev'
  // Response 变体（服务器返 getListResponse 而非 getListRangeResponse）
  | 'getListResponse'
  | 'getCurrentResponse'
  | 'setCurrentResponse'
  | 'nextResponse'
  | 'prevResponse'

export type QsoSubType = 'getList' | 'getDetail' | 'getListResponse' | 'getDetailResponse'

export type UserSubType = 'getInfo' | 'getInfoResponse'

export type FmoRequest =
  | { type: 'message'; subType: MessageSubType; reqId?: string; data?: unknown }
  | { type: 'station'; subType: StationSubType; reqId?: string; data?: unknown }
  | { type: 'qso'; subType: QsoSubType; reqId?: string; data?: unknown }
  | { type: 'user'; subType: UserSubType; reqId?: string; data?: unknown }

export interface FmoResponseBase {
  code: number
  reqId?: string
  data: unknown
}

export type FmoResponse =
  | ({ type: 'message'; subType: MessageSubType } & FmoResponseBase)
  | ({ type: 'station'; subType: StationSubType } & FmoResponseBase)
  | ({ type: 'qso'; subType: QsoSubType } & FmoResponseBase)
  | ({ type: 'user'; subType: UserSubType } & FmoResponseBase)
