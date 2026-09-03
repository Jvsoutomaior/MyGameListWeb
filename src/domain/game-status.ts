import type { GameStatus } from '@/api/types'

export const gameStatusLabels: Record<GameStatus, string> = {
  PLAN_TO_PLAY: 'Quero jogar',
  PLAYING: 'Jogando',
  COMPLETED: 'Concluído',
  ON_HOLD: 'Em pausa',
  DROPPED: 'Abandonado',
}

export const gameStatusOptions = Object.entries(gameStatusLabels).map(([value, label]) => ({
  value: value as GameStatus,
  label,
}))
