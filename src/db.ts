import debug from "debug";
import path from "path";
import Identities, { Identity } from 'orbit-db-identity-provider'
import { OrbitDB } from "orbit-db";
import { TupeloIdentityProvider, TupeloIdentityProviderOptions } from "orbitdb-tupelo"
import IPFS from "ipfs";
import { ChainTree } from "tupelo-wasm-sdk";

const log = debug("db")
const Keystore = require("orbit-db-keystore")
const keyPath = path.resolve("./user/keys")

let _ipfsNodePromise: Promise<IPFS>
let _orbitdbPromise: Promise<OrbitDB>

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
                repo: './ipfs',
                EXPERIMENTAL: { pubsub: true },
                config: {
                    Bootstrap: [],
                    Addresses: { Swarm: [] }
                }
            })
            ipfs.on("ready", () => resolve(ipfs))
        })
    }

    return _ipfsNodePromise
}

async function newIdentity(userTree: ChainTree, keyStore: any): Promise<Identity> {
    const did = await userTree.id()
    if (did === null) {
        throw new Error("Null user chaintree did!")
    }

    const opts: TupeloIdentityProviderOptions = {
        type: TupeloIdentityProvider.type,
        tree: userTree,
        did: did,
        keystore: keyStore
    }

    return Identities.createIdentity(opts)
}

export async function getOrbitInstance(userTree: ChainTree): Promise<OrbitDB> {
    log("finding orbit-db instance")
    if (_orbitdbPromise === undefined) {
        log("orbit-db instances doesn't yet exist. initializing new one")
        const ipfsNode = await getIpfsNode()
        const keystore = new Keystore(keyPath)
        const identity = await newIdentity(userTree, keystore)
        const orbitOpts = { keystore, identity }

        _orbitdbPromise = OrbitDB.createInstance(ipfsNode, orbitOpts)
    }

    return _orbitdbPromise
}
