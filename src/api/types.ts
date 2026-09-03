export type User = {
  id: string
  username: string
  bio: string | null
  createdAt: string
}

export type Game = {
  id: string
  title: string
  coverUrl: string | null
  releaseDate: string | null
}

export type GameStatus = 'PLAN_TO_PLAY' | 'PLAYING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED'

export type GameListEntry = {
  id: string
  game: Game
  status: GameStatus
  score: number | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

export type Page<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}
