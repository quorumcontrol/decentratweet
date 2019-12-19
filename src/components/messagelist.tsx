import React, { useContext, useState, useEffect } from 'react';
import { Message, Container } from 'react-bulma-components';
import { StoreContext } from '../state/store';
import { Tweet } from 'tweet';
import { User } from 'identity';

const useUserTweetFeed = (user?: User) => {
  const [state, setState] = useState({ messages: [] } as { messages: Tweet[] })

  function updateState(user: User) {
    if (user && user.feed) {
      console.log("all: ", user.feed.all())
      setState({ messages: user.allTweets() })
    }
  }

  useEffect(() => {
    if (user && user.feed) {
      updateState(user)
      user.on('new', () => {
        updateState(user)
      })
    }
  }, [user])

  return state
}

export function UserMessageList() {
  const [globalState] = useContext(StoreContext)

  const feed = useUserTweetFeed(globalState.user)

  return (
    <Container>
      <ol style={{ listStyleType: 'none' }}>
        {feed.messages.map((msg) => {
          return <MessageElement message={msg} />
        })}
      </ol>
    </Container>
  )
}

const MessageElement = ({ message }: { message: Tweet }) => {
  return (
    <li key={message.time.getTime()} style={{marginBottom:"1em"}}>
      <Message color="info">
        <Message.Header>
          {message.name} tweeted
        </Message.Header>
        <Message.Body style={{ whiteSpace: 'pre' }}>
          {message.message}
        </Message.Body>
      </Message>
    </li>
  )
}
