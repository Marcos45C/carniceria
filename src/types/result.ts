export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }