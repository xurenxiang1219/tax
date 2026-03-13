import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-4', 'py-2', 'bg-blue-600')
    expect(result).toBe('px-4 py-2 bg-blue-600')
  })

  it('should handle conditional classes', () => {
    const result = cn('px-4', false && 'hidden', 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-4 px-2')
    expect(result).toBe('px-2')
  })
})
