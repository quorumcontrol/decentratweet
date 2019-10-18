import React, { useContext, useState } from 'react';
import { Container, Button, Level } from 'react-bulma-components'
import { Redirect, RouteProps } from 'react-router';
import { StoreContext } from '../state/store';
import { TweetComposer } from "../components/composer"

export function Tweets(props: RouteProps) {
  const [state, setState] = useState({
    loading: true,
    showComposeModal: false
  })
  const [globalState] = useContext(StoreContext)

  if (!globalState.userTree) {
    return (
      <Redirect to={{
        pathname: "/login",
        state: { from: props.location },
      }} />
    )
  }

  return (
    <Container>
      <TweetComposer show={state.showComposeModal} onClose={() => { setState({ ...state, showComposeModal: false }) }} userTree={globalState.userTree} />
      <Level>
        <Level.Side align="left">
          <Level.Item>
            <Button onClick={() => { setState({ ...state, showComposeModal: true }) }}>New Tweet</Button>
          </Level.Item>
        </Level.Side>
      </Level>
    </Container>
  )
}
