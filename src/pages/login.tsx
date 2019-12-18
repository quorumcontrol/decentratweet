import { debug } from "debug";
import React, { useReducer, useState, useContext } from "react";
import { RouteProps, Redirect } from "react-router";
import { Columns, Heading, Form, Icon, Loader, Button } from "react-bulma-components";
import { ChainTree } from "tupelo-wasm-sdk";
import { findUserAccount, verifyAccount, register } from "../identity";
import { StoreContext, AppActions, IAppLogin } from "../state/store"
import { TweetFeed } from "../tweet"
import { getOrbitInstance } from "../db";
import { feedAddressPath } from "../data";

const log = debug("loginPage")

interface ILoginState {
  loading: boolean
  username: string
  password: string
  userTree?: ChainTree
  loadingText: string
}

enum Actions {
  loginFormType,
  passwordFormType,
  userTree,
  registering,
  loggingIn,
}

interface ILoginActions {
  type: Actions
}

interface IUsernameType extends ILoginActions {
  type: Actions.loginFormType
  username: string
  dispatch: Function
}

interface IPasswordType extends ILoginActions {
  type: Actions.passwordFormType
  password: string
}

interface IUserTree extends ILoginActions {
  type: Actions.userTree
  username: string
  tree?: ChainTree
  dispatch: Function
}

const initialState = {
  loading: false,
  username: "",
  password: "",
  loadingText: "",
}


let usernameTimeout: number | undefined;

const checkUsername = (state: ILoginState, dispatch: Function) => {
  const later = async () => {
    const username = state.username
    if (!username) {
      return //nothing to do on an empty username
    }

    log("looking up account for: ", username)
    let tree = await findUserAccount(username)

    log("dispatching userTree event")
    dispatch({
      type: Actions.userTree,
      username: username,
      tree: tree,
      dispatch: dispatch,
    } as IUserTree)

    usernameTimeout = undefined;
  };

  clearTimeout(usernameTimeout);
  usernameTimeout = setTimeout(later, 150) as any; // nodejs and browser have differing types for the timeout return
}

function reducer(state: ILoginState, action: ILoginActions) {
  switch (action.type) {
    case Actions.loginFormType:
      const username = (action as IUsernameType).username
      checkUsername(state, (action as IUsernameType).dispatch)
      return { ...state, loading: true, loginText: "Checking for username availability", username: username }
    case Actions.userTree:
      const act = action as IUserTree
      log("user tree received: ", act.username, " state: ", state.username)
      if (act.username !== state.username) {
        // this means we missed one
        checkUsername(state, act.dispatch)
        return state // don't update anything yet
      }
      return { ...state, loading: false, loadingText: "", userTree: (action as IUserTree).tree }
    case Actions.passwordFormType:
      return { ...state, password: (action as IPasswordType).password }
    case Actions.registering:
      return { ...state, loading: true, loadingText: "Registering your user" }
    case Actions.loggingIn:
      return { ...state, loading: true, loadingText: "Logging in" }
    default:
      throw new Error("unkown type: " + action.type)
  }
}

const isAvailable = (state: ILoginState) => {
  return !state.loading && state.username && !state.userTree
}

// colors: '"link" | "success" | "primary" | "info" | "warning" | "danger" | "light" | "dark" | "white" | "black" |

function UsernameField({ state, onChange }: { state: ILoginState, onChange: React.ChangeEventHandler }) {
  return (
    <Form.Field>
      <Form.Label>Username</Form.Label>
      <Form.Control iconLeft>
        <Form.Input color={isAvailable(state) ? "success" : "info"} type="text" placeholder="Username" value={state.username} onChange={onChange} />
        {state.loading ?
          <Icon align="left"><span className="fas fa-spinner fa-pulse" /></Icon>
          :
          <Icon align="left"><span className="fas fa-user" /></Icon>
        }
      </Form.Control>
      {isAvailable(state) && <Form.Help color="success">This username is available</Form.Help>}
    </Form.Field>
  )
}

function PasswordField({ name, value, onChange, error }: { name: string, value: string, error: string, onChange: React.ChangeEventHandler }) {
  return (
    <Form.Field>
      <Form.Label>{name}</Form.Label>
      <Form.Control iconLeft>
        <Form.Input className={error ? "animated pulse faster" : ""} color={error ? "danger" : "info"} type="password" placeholder="Password" value={value} onChange={onChange} />
        <Icon align="left"><span className="fas fa-key" /></Icon>
      </Form.Control>
      {error && <Form.Help color="danger">{error}</Form.Help>}
    </Form.Field>
  )
}

function LoginBottom({ state, dispatch, onLogin }: { state: ILoginState, dispatch: Function, onLogin: Function }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (state.userTree === undefined) {
      throw new Error("must have a user tree to login")
    }

    const tree = state.userTree
    const username = state.username

    const [verified, verTree] = await verifyAccount(username, password, tree)
    if (verified) {
      onLogin(verTree)
    } else {
      setError("invalid password")
    }
  }

  return (
    <div>
      <PasswordField error={error} name="Password" value={password} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(""); setPassword(evt.target.value) }} />
      <Button onClick={handleSubmit}>Login</Button>
    </div>
  )
}

function RegisterBottom({ state, dispatch, onLogin }: { state: ILoginState, dispatch: Function, onLogin: Function }) {
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState("")

  const isConfirmed = () => {
    return password === passwordConfirm
  }

  const handleSubmit = () => {
    if (!isConfirmed()) {
      setError("Passwords do not match")
      return // do nothing here
    }
    dispatch({ type: Actions.registering })
    const doRegister = async () => {
      const username = state.username
      const userTree = await register(username, password)

      onLogin(userTree)
    }
    doRegister()
  }

  return (
    <div>
      <PasswordField error={error} name="Password" value={password} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(""); setPassword(evt.target.value) }} />
      <PasswordField error={error} name="Confirm Password" value={passwordConfirm} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(""); setPasswordConfirm(evt.target.value) }} />
      <Button onClick={handleSubmit}>Register</Button>
    </div>
  )
}

export function LoginForm(props: RouteProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [redirect, doRedirect] = useState(false)

  const [, globalDispatch] = useContext(StoreContext)

  const handleUsernameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: Actions.loginFormType, username: evt.target.value, dispatch: dispatch } as IUsernameType)
  }

  const onLogin = async (tree: ChainTree) => {
    const did = await tree.id()
    const db = await getOrbitInstance(tree)
    const addressResponse = await tree.resolveData(feedAddressPath)
    const tweetFeed = await TweetFeed.open(db, addressResponse.value)

    globalDispatch({
      type: AppActions.login,
      userTree: tree,
      username: state.username,
      did: did,
      feed: tweetFeed
    } as IAppLogin)
    doRedirect(true)
  }

  let { from } = (props.location && props.location.state) ? props.location.state : { from: { pathname: "/tweets" } };

  if (redirect) {
    return (
      <Redirect to={from} />
    )
  }

  return (
    <div>
      <Columns className="is-desktop">
        <Columns.Column size={"half"}>
          <Heading className="animated flipInX fast">Welcome to Decentratweet!</Heading>
          <Heading subtitle>Find or create your decentraccount.</Heading>
        </Columns.Column>
      </Columns>

      <Columns className="is-desktop">
        <Columns.Column size={"half"}>
          <UsernameField state={state} onChange={handleUsernameChange} />
          {state.loading && state.username &&
            <div>
              <Loader style={{ width: 25, height: 25 }} />
              <p className="animated flipInX fast">{state.loadingText}</p>
            </div>
          }
          {!state.loading && state.username && state.userTree && <LoginBottom state={state} dispatch={dispatch} onLogin={onLogin} />}
          {!state.loading && state.username && !state.userTree && <RegisterBottom state={state} dispatch={dispatch} onLogin={onLogin} />}
        </Columns.Column>
      </Columns>
    </div>
  )
}
