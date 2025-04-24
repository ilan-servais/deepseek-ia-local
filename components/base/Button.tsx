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
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm',
    outline: 'bg-transparent border-2 border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
  }

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2.5 px-5',
    lg: 'text-lg py-3.5 px-7'
  }

  const baseClasses = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1'
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed shadow-none' : 'cursor-pointer'

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
