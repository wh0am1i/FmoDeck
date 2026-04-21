// src/types/sstv.ts

export type SstvMode = 'robot36' | 'robot72' | 'martin-m1' | 'martin-m2' | 'pd120'

export interface SstvImage {
  id: string
  createdAt: number
  mode: SstvMode
  width: number
  height: number
  imageBlob: Blob
  thumbnailBlob: Blob
}
