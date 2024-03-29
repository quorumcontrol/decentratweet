import React, { useContext } from 'react';
import { Message, Button, Container } from 'react-bulma-components';
import { StoreContext, IAppMessage, AppActions, IAppRemoveMessage } from '../state/store';

export function UserMessageList() {
  const [globalState] = useContext(StoreContext)

  const lis = globalState.messages.map((msg) => {
    return <MessageElement message={msg} />
  })

  return (
    <Container>
      <ol style={{ listStyleType: 'none' }}>
        {lis}
      </ol>
    </Container>
  )
}

const MessageElement = ({ message }: { message: IAppMessage }) => {
  const [, globalDispatch] = useContext(StoreContext)

  if (message.id === undefined) {
    throw new Error("a message must have an id when it's in the list")
  }

  return (
    <li key={message.id}>
      <Message color="info">
        <Message.Header>
          {message.title}
          <Button remove onClick={() => { globalDispatch({ type: AppActions.removeMessage, id: message.id } as IAppRemoveMessage) }} />
        </Message.Header>
        <Message.Body style={{ whiteSpace: 'pre' }}>
          {message.body}
        </Message.Body>
      </Message>
    </li>
  )
}
