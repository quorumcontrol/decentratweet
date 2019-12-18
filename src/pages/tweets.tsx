import React, { useContext, useState } from 'react';
import { Container, Button, Level } from 'react-bulma-components'
import { Redirect, RouteProps } from 'react-router';
import { StoreContext } from '../state/store';
import { TweetComposer } from "../components/composer"
import { Followed } from "../components/followed"

export function Tweets(props: RouteProps) {
  const [state, setState] = useState({
    loading: true,
    showComposeModal: false,
    showFollowModal: false
  })
  const [globalState] = useContext(StoreContext)

  if (!globalState.userTree || !globalState.tweetFeed) {
    return (
      <Redirect to={{
        pathname: "/login",
        state: { from: props.location },
      }} />
    )
  }


  return (
    <Container>
      <TweetComposer show={state.showComposeModal} onClose={() => { setState({ ...state, showComposeModal: false }) }} feed={globalState.tweetFeed} />
      <Followed show={state.showFollowModal} onClose={() => { setState({ ...state, showFollowModal: false }) }} userTree={globalState.userTree} />
      <Level>
        <Level.Side align="left">
          <Level.Item>
            <Button onClick={() => { setState({ ...state, showComposeModal: true }) }}>New Tweet</Button>
          </Level.Item>
          <Level.Item>
            <Button onClick={() => { setState({ ...state, showFollowModal: true }) }}>Follow</Button>
          </Level.Item>
        </Level.Side>
      </Level>
    </Container>
  )
}
