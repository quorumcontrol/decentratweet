import { debug } from "debug";
import React, { createContext, useReducer, useEffect, useState } from "react";
import { getAppCommunity } from "../appcommunity";
import { User, fromDidAndKeyString } from "../identity"


const log = debug("stateStore")
declare const Go: any;

if (window) {
  const subDirectory = window.location.pathname
  log("subDirectory ", subDirectory)

  if (subDirectory !== '/') {
    log("setting wasmpath to: ", subDirectory + "tupelo.wasm")
    Go.setWasmPath(subDirectory + "tupelo.wasm");
  }
}

export interface IAppMessage {
  id?: string
  color?: string
  title: string
  body: string
}

interface IAppState {
  user?:User
  loading: number
}

export enum AppActions {
  loading,
  stopLoading,
  login,
  message,
  logout,
}

export interface IAppAction {
  type: AppActions
}

export interface IAppLoading extends IAppAction {
  type: AppActions.loading
}

export interface IAppStopLoading extends IAppAction {
  type: AppActions.stopLoading
}

export interface IAppLogin extends IAppAction {
  type: AppActions.login
  user:User
}

export interface IAppMessage extends IAppAction {
  type: AppActions.message,
  message: IAppMessage,
}

export interface IAppLogout extends IAppAction {
  type: AppActions.logout
}

const initialState = { loading: 1, messages: [] } as IAppState

function reducer(state: IAppState, action: IAppAction) {
  let act
  switch (action.type) {
    case AppActions.loading:
      return { ...state, loading: state.loading + 1 }
    case AppActions.stopLoading:
      return { ...state, loading: state.loading - 1 }
    case AppActions.login:
      act = action as IAppLogin
      return { ...state, user: act.user }
    case AppActions.logout:
      sessionStorage.removeItem('userDid')
      sessionStorage.removeItem('userKey')
      return { ...initialState, loading: 0 }
    default:
      throw new Error("unkown type: " + action.type)
  }
}

const StoreContext = createContext([initialState, () => { }] as [IAppState, React.Dispatch<IAppAction>]);

const StoreProvider = ({ children }: { children: JSX.Element[] }) => {
  const [firstRun, setFirstRun] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);

  // On every state set
  useEffect(
    () => {
      if (firstRun) {
        setFirstRun(false)

        // go ahead and just get a community going
        // it will make login/register faster
        getAppCommunity()

        const did = sessionStorage.getItem('userDid')
        const userKey = sessionStorage.getItem('userKey')
        const doAsyncSet = async () => {
          if (!did || !userKey) {
            throw new Error("no did or no userKey")
          }
          let user:User
          try {
            user = await fromDidAndKeyString(did, userKey)
          } catch(e) {
            if (e === 'not found') {
              dispatch({
                type: AppActions.logout
              } as IAppLogout)
              return
            }
            throw e
          }
          
          dispatch({
            type: AppActions.login,
            user: user,
          } as IAppLogin)

          dispatch({
            type: AppActions.stopLoading,
          } as IAppStopLoading)
        }

        if (did && userKey) {
          doAsyncSet()
        } else {
          console.log('stopping loading')
          dispatch({
            type: AppActions.stopLoading
          } as IAppStopLoading)
        }
      }

      if (state.user && state.user.did && state.user.tree.key && state.user.tree.key.privateKey) {
        sessionStorage.setItem('userDid', state.user.did)
        sessionStorage.setItem('userKey', Buffer.from(state.user.tree.key.privateKey).toString('base64'))
      }

      console.log({ newState: state });
    },
    [state, firstRun]
  );

  // Render state, dispatch and special case actions
  return (
    <StoreContext.Provider value={[state, dispatch]}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
