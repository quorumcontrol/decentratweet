import debug from "debug";
import { ChainTree, EcdsaKey, setDataTransaction, setOwnershipTransaction, Tupelo } from "tupelo-wasm-sdk";
import { getAppCommunity, txsWithCommunityWait } from "./appcommunity";

const log = debug("identity")

const userNamespace = Buffer.from("decentratweetUsers")

/**
 * The path within the user ChainTree where decentratweet stores the username
 */
export const usernamePath = "/_decentratweet/username"

/**
 * Generates a public/private keypair from an *insecure* passphrase (username).
 * The generated ChainTree will have a known name derived from the username
 * argument. The very first thing you do with the ChainTree should be to
 * ChangeOwner @param username - the username
 */
export const publicUserKey = async (username: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(username), userNamespace)
}

/**
 * Convert a username-password pair into a secure ecdsa key pair for owning
 * arbitrary chaintrees.
 */
export const securePasswordKey = async (username: string, password: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
}

/**
 * When given a public-private key pair, returns the did of a chaintree created
 * by that pairing
 */
const didFromKey = async (key: EcdsaKey) => {
    return await Tupelo.ecdsaPubkeyToAddress(key.publicKey)
}

/**
 * Looks up the user chaintree for the given username, returning it if it
 * exists.
 */
export const findUserTree = async (username: string) => {
    const c = await getAppCommunity()
    const insecureKey = await publicUserKey(username)
    const did = await didFromKey(insecureKey)

    let tip
    let tree: ChainTree | undefined = undefined

    try {
        tip = await c.getTip(did)
    } catch (e) {
        if (e === "not found") {
            // do nothing, let tip be null
        }
    }

    if (tip !== undefined) {
        tree = new ChainTree({
            store: c.blockservice,
            tip: tip,
        })
    }

    return tree
};

/**
 * Registers a username-password pair by creating a new chaintree corresponding
 * to the username, and transferring ownership to the secure key pair
 * corresponding to the username-password pair.
 *
 * Returns a handle for the created * chaintree
 */
export const register = async (username: string, password: string) => {
    const c = await getAppCommunity()

    const insecureKey = await publicUserKey(username)
    const secureKey = await securePasswordKey(username, password)
    const secureKeyAddress = await didFromKey(secureKey)

    log("creating user chaintree")
    const userTree = await ChainTree.newEmptyTree(c.blockservice, insecureKey)

    log("transferring ownership of user chaintree")
    await txsWithCommunityWait(userTree, [
        // Set the ownership of the user chaintree to our secure key (thus
        // owning the username)
        setOwnershipTransaction([secureKeyAddress]),

        // Cache the username inside of the chaintree for easier access later
        setDataTransaction(usernamePath, username),
    ])

    userTree.key = secureKey
}
