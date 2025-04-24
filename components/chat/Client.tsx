'use client'

import Form from '@/components/base/Form'
import Input from '@/components/base/Input'
import Button from '@/components/base/Button'

const ChatClient: React.FC = () => {
  const onSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.entries().forEach(([name, value], index) => {
      console.log('name, value, index: ', name, value, index)
    })
  }

  return (
    <Form onSubmit={onSubmitHandler}>
      <Input name="prompt" />
      <Button type="submit">Envoyer</Button>
    </Form>
  )
}

export default ChatClient
