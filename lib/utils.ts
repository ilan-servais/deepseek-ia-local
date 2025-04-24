import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scrollToBottom(element: HTMLElement | null) {
  if (!element) return
  
  // Use requestAnimationFrame to ensure the scroll happens after rendering
  requestAnimationFrame(() => {
    element.scrollTop = element.scrollHeight
  })
}
