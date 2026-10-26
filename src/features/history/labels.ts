import type { ChangeType } from '../../types/history'

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  initial: 'Alta inicial',
  individual: 'Modificación individual',
  bulk_update: 'Actualización masiva',
  reversal: 'Reversión',
}

export const CHANGE_TYPES: ChangeType[] = ['initial', 'individual', 'bulk_update', 'reversal']