import type { Cut } from '../../types/cut'

/**
 * DATOS DE DEMOSTRACIÓN: todos los cortes y precios de este archivo son
 * ficticios. No representan precios reales de ninguna carnicería.
 */
export const DEMO_CUTS: Cut[] = [
  { id: 'demo-01', name: 'Asado de tira', category: 'Vacuno', unit: 'kg', price: 12500, priceUpdatedAt: '2026-10-14T13:20:00Z', isActive: true },
  { id: 'demo-02', name: 'Vacío', category: 'Vacuno', unit: 'kg', price: 13800, priceUpdatedAt: '2026-10-14T13:20:00Z', isActive: true },
  { id: 'demo-03', name: 'Bife de chorizo', category: 'Vacuno', unit: 'kg', price: 15200, priceUpdatedAt: '2026-10-09T12:05:00Z', isActive: true },
  { id: 'demo-04', name: 'Nalga', category: 'Vacuno', unit: 'kg', price: 11900, priceUpdatedAt: '2026-10-09T12:05:00Z', isActive: true },
  { id: 'demo-05', name: 'Picada común', category: 'Vacuno', unit: 'kg', price: 8900, priceUpdatedAt: '2026-09-30T15:40:00Z', isActive: true },
  { id: 'demo-06', name: 'Costilla de cerdo', category: 'Cerdo', unit: 'kg', price: 7800, priceUpdatedAt: '2026-10-02T14:10:00Z', isActive: true },
  { id: 'demo-07', name: 'Bondiola', category: 'Cerdo', unit: 'kg', price: 8400, priceUpdatedAt: '2026-10-02T14:10:00Z', isActive: true },
  { id: 'demo-08', name: 'Pechuga de pollo', category: 'Pollo', unit: 'kg', price: 7200, priceUpdatedAt: '2026-10-16T11:30:00Z', isActive: true },
  { id: 'demo-09', name: 'Pollo entero', category: 'Pollo', unit: 'kg', price: 3950.5, priceUpdatedAt: '2026-10-16T11:30:00Z', isActive: true },
  { id: 'demo-10', name: 'Chorizo', category: 'Embutidos', unit: 'kg', price: 6900, priceUpdatedAt: '2026-09-25T16:00:00Z', isActive: true },
  { id: 'demo-11', name: 'Morcilla', category: 'Embutidos', unit: 'kg', price: 5600, priceUpdatedAt: '2026-09-25T16:00:00Z', isActive: true },
  { id: 'demo-12', name: 'Chinchulines', category: 'Achuras', unit: 'kg', price: 6200, priceUpdatedAt: '2026-10-05T13:45:00Z', isActive: true },
  { id: 'demo-13', name: 'Riñón', category: 'Achuras', unit: 'kg', price: 3100, priceUpdatedAt: '2026-08-20T12:00:00Z', isActive: false },
  { id: 'demo-14', name: 'Lomo', category: 'Vacuno', unit: 'kg', price: 17800, priceUpdatedAt: '2026-08-20T12:00:00Z', isActive: false },
]