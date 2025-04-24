import { type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const BaseButton: React.FC<BaseButtonProps> = (props) => {
  const { 
    children, 
    className = '', 
    variant = 'primary', 
    size = 'md',
    disabled = false,
    ...rest 
  } = props

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    outline: 'bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-800'
  }

  const sizeClasses = {
    sm: 'text-sm py-1 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-6'
  }

  const baseClasses = 'font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}

export default BaseButton
