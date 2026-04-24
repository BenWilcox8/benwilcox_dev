import { useContext } from 'react'
import { KeyboardNavContext } from './keyboardNavContext'

export function useKeyboardNav() {
  const context = useContext(KeyboardNavContext)

  if (!context) {
    throw new Error('useKeyboardNav must be used within KeyboardNavProvider')
  }

  return context
}
