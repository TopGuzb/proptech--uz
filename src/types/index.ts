export interface Company {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export interface Project {
  id: string
  company_id: string
  name: string
  location: string
  description?: string
  created_at: string
}

export interface Building {
  id: string
  project_id: string
  name: string
  floors_count: number
  created_at: string
}

export interface Floor {
  id: string
  building_id: string
  floor_number: number
}

export type ApartmentStatus = 'available' | 'reserved' | 'sold'

export interface Apartment {
  id: string
  floor_id: string
  building_id: string
  project_id: string
  client_id?: string
  number: string
  rooms_count: number
  size_m2: number
  price: number
  status: ApartmentStatus
  created_at: string
}

export type ClientStatus = 'new' | 'contacted' | 'viewing' | 'reserved' | 'bought'

export interface Client {
  id: string
  company_id: string
  full_name: string
  phone: string
  email: string
  budget_usd: number
  status: ClientStatus
  notes?: string
  ai_score: number
  created_at: string
}

export interface Resident {
  id: string
  apartment_id: string
  client_id?: string
  full_name: string
  phone: string
  email: string
  move_in_date: string
  is_owner: boolean
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue'

export interface JKHPayment {
  id: string
  apartment_id: string
  resident_id: string
  month: string
  electricity: number
  water: number
  gas: number
  maintenance: number
  total: number
  paid_amount: number
  debt_amount: number
  payment_status: PaymentStatus
  is_paid: boolean
}

export interface JKHRequest {
  id: string
  apartment_id: string
  resident_id: string
  category: string
  title: string
  description?: string
  status: 'new' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export interface Sale {
  id: string
  apartment_id: string
  client_id: string
  price: number
  sold_at: string
}
