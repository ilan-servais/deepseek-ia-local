import { type InputHTMLAttributes } from 'react'

export type BaseInputProps = InputHTMLAttributes<HTMLInputElement>

const BaseInput: React.FC<BaseInputProps> = (props) => {
  const { className = '', ...rest } = props
  return <input className={`px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`} {...rest} />
}

export default BaseInput
