import { vi } from 'vitest'

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    storage[k] = v
  },
  removeItem: (k: string) => {
    delete storage[k]
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k])
  },
  get length() {
    return Object.keys(storage).length
  },
  key: () => null,
}

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('document', {
  documentElement: { setAttribute: vi.fn(), getAttribute: vi.fn() },
})
