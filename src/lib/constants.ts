export const COMPANY_ID = '11111111-1111-1111-1111-111111111111'

export const MAINTENANCE_RATE = 5000 // сум per m²

export const APARTMENT_STATUS_LABELS = {
  available: 'Свободна',
  reserved:  'Резерв',
  sold:      'Продана',
} as const

export const CLIENT_STATUS_LABELS = {
  new:       'Новый',
  contacted: 'Связались',
  viewing:   'Просмотр',
  reserved:  'Резерв',
  bought:    'Куплено',
} as const

export const PAYMENT_STATUS_LABELS = {
  paid:    'Оплачено',
  partial: 'Частично',
  unpaid:  'Не оплачено',
  overdue: 'Просрочено',
} as const

export const STATUS_COLORS = {
  available: 'green',
  reserved:  'amber',
  sold:      'red',
} as const
