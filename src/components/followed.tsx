import React, { useState } from "react"
import { Modal, Form, Button, Media, Content, Loader } from "react-bulma-components"
import { ChainTree } from "tupelo-wasm-sdk"
import { follow } from "../tweet"

export function Followed({ show, onClose, userTree }: { userTree: ChainTree, show: boolean, onClose: (() => void) }) {
  const [state, setState] = useState({
    loading: false,
    followed: ""
  })

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [evt.target.name]: evt.target.value })
  }

  const handleSubmit = () => {
    setState({ ...state, loading: true })
    const doAsync = async () => {
      await follow(userTree, state.followed)
      setState({ ...state, loading: false, followed: "" })
      onClose()
    }

    doAsync()
  }

  return (
    <Modal show={show} onClose={onClose}>
      <Modal.Card style={{ backgroundColor: "white" }}>
        <Modal.Card.Head>
          <Modal.Card.Title>
            Follow Tweeter
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
                    <Form.Label>User Name</Form.Label>
                    <Form.Control>
                      <Form.Input value={state.followed} onChange={handleChange} name="followed" placeholder="Joe Influencer" />
                    </Form.Control>
                  </Form.Field>
                  <Form.Field kind="group">
                    <Button color="primary" onClick={handleSubmit}>Follow</Button>
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
