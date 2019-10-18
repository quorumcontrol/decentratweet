import React, { useState } from "react"
import { Modal, Form, Button, Media, Content, Loader } from "react-bulma-components"
import { ChainTree } from "tupelo-wasm-sdk"
import { saveTweet } from "../tweet"

export function TweetComposer({ show, onClose, userTree }: { userTree: ChainTree, show: boolean, onClose: (() => void) }) {
  const [state, setState] = useState({
    loading: false,
    message: ""
  })

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [evt.target.name]: evt.target.value })
  }

  const handleSubmit = () => {
    setState({ ...state, loading: true })
    const doAsync = async () => {
      await saveTweet(userTree, state.message)
      setState({ ...state, loading: false, message: "" })
      onClose()
    }

    doAsync()
  }

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Card style={{ backgroundColor: "white" }}>
        <Modal.Card.Head>
          <Modal.Card.Title>
            Compose Tweet
            </Modal.Card.Title>
        </Modal.Card.Head>
        <Modal.Card.Body>
          <Media>
            {state.loading ?
              <Loader />
              :
              <Media.Item>
                <Content>
                  <Form.Field>
                    <Form.Label>Message</Form.Label>
                    <Form.Control>
                      <Form.Input value={state.message} onChange={handleChange} name="message" placeholder="Your hot take" />
                    </Form.Control>
                  </Form.Field>
                  <Form.Field kind="group">
                    <Button color="primary" onClick={handleSubmit}>Tweet It!</Button>
                    <Button text onClick={() => { onClose() }}>Cancel</Button>
                  </Form.Field>
                </Content>
              </Media.Item>
            }
          </Media>
        </Modal.Card.Body>
      </Modal.Card>
    </Modal>
  )
}
