import { type InputHTMLAttributes } from 'react'

export type BaseInputProps = InputHTMLAttributes<HTMLInputElement>

const BaseInput: React.FC<BaseInputProps> = (props) => {
  const { className = '', ...rest } = props
  return <input className={`px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all ${className}`} {...rest} />
}

export default BaseInput
