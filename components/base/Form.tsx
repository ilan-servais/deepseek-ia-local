import { type FormHTMLAttributes } from 'react'

export type BaseFormProps = FormHTMLAttributes<HTMLFormElement>

const BaseForm: React.FC<BaseFormProps> = (props) => {
  const { children, className = '', ...rest } = props
  return <form className={className} {...rest}>{children}</form>
}

export default BaseForm
