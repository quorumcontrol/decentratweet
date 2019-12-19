import debug from "debug";
import Identities, { Identity } from 'orbit-db-identity-provider'
import OrbitDB from "orbit-db";
import { TupeloIdentityProvider, TupeloIdentityProviderOptions } from "orbitdb-tupelo"
import IPFS from "ipfs";
import { ChainTree } from "tupelo-wasm-sdk";
import { getAppCommunity } from "appcommunity";

declare const window:any;

const log = debug("db")

let _ipfsNodePromise: Promise<IPFS>
let _orbitdbPromise: Promise<OrbitDB>
TupeloIdentityProvider.community = getAppCommunity()
Identities.addIdentityProvider(TupeloIdentityProvider)

/**
* Returns the IPFS node for the application. This node is only created once and
* stored for later use by subsequent callers of this function
*/
function getIpfsNode(): Promise<IPFS> {
    log("fetching ipfs node")
    if (_ipfsNodePromise === undefined) {
        log("ipfs node doesn't yet exist. initializing new one")
        _ipfsNodePromise = new Promise(async (resolve) => {
            const ipfs = new IPFS({
                config: {
                    Addresses:{Swarm:["/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star"]}
                }
            })
            ipfs.on("ready", () => resolve(ipfs))
        })
    }

    return _ipfsNodePromise
}

async function newIdentity(userTree: ChainTree): Promise<Identity> {
    const did = await userTree.id()
    if (did === null) {
        throw new Error("Null user chaintree did!")
    }

    const opts: TupeloIdentityProviderOptions = {
        type: TupeloIdentityProvider.type,
        tree: userTree,
        did: did,
    }

    return Identities.createIdentity(opts)
}

//TODO: theoretically you could put a different userTree here and you'd get back the *other*
//users tree: this is ALPHA software - dragons
// I think the usecase is to have a map of userTree -> orbit instances instead of the singleton promise
export function getOrbitInstance(userTree: ChainTree): Promise<OrbitDB> {
    log("finding orbit-db instance")
    if (_orbitdbPromise) {
        return _orbitdbPromise
    }
    _orbitdbPromise = new Promise(async (resolve,reject)=> {
        log("orbit-db instances doesn't yet exist. initializing new one")
        try {
            const ipfsNode = await getIpfsNode()
            // const orbitOpts = { keystore, identity }
            const identity = await newIdentity(userTree)

            const inst = await OrbitDB.createInstance(ipfsNode, {identity: identity})
            window.orbitDb = inst
            resolve(inst)
        } catch(e) {
            reject(e)
        }
    })

    return _orbitdbPromise
}
