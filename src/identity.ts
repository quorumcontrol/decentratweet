import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, EcdsaKey, setDataTransaction, setOwnershipTransaction, Tupelo } from "tupelo-wasm-sdk";
import { getAppCommunity, txsWithCommunityWait } from "./appcommunity";
import { getOrbitInstance } from "./db";
import { TweetFeed } from "./tweet";
import { feedAddressPath } from "./data"

const log = debug("identity")

const userNamespace = Buffer.from("decentratweetUsers")

/**
 * The path within the user ChainTree where decentratweet stores the username
 */
export const usernamePath = appDataPrefix + "/username"

/**
 * Generates a public/private keypair from an *insecure* passphrase (username).
 * The generated ChainTree will have a known name derived from the username
 * argument. The very first thing you do with the ChainTree should be to
 * ChangeOwner @param username - the username
 */
const insecureUsernameKey = async (username: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(username), userNamespace)
}

/**
 * Convert a username-password pair into a secure ecdsa key pair for owning
 * arbitrary chaintrees.
 */
const securePasswordKey = async (username: string, password: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
}

/**
 * When given a public-private key pair, returns the did of a chaintree created
 * by that pairing
 */
const didFromKey = async (key: EcdsaKey) => {
    return await Tupelo.ecdsaPubkeyToDid(key.publicKey)
}

/**
 * Looks up the user account chaintree for the given username, returning it if
 * it exists.
 */
export const findUserAccount = async (username: string) => {
    const c = await getAppCommunity()
    const insecureKey = await insecureUsernameKey(username)
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
 * Verifies that the secure password key generated with the provided username
 * and password matches one of the owner keys for the provided chaintree.
 */
export const verifyAccount = async (username: string, password: string, userTree: ChainTree) => {
    let secureKey = await securePasswordKey(username, password)
    let secureAddr = await didFromKey(secureKey)
    let resolveResp = await userTree.resolve("tree/_tupelo/authentications")
    let auths: string[] = resolveResp.value
    if (auths.includes(secureAddr)) {
        userTree.key = secureKey

        return [true, userTree]
    } else {
        return [false, null]
    }
}

/**
 * Registers a username-password pair by creating a new account chaintree
 * corresponding to the username, and transferring ownership to the secure key
 * pair corresponding to the username-password pair.
 *
 * Returns a handle for the created * chaintree
 */
export const register = async (username: string, password: string) => {
    const c = await getAppCommunity()

    const insecureKey = await insecureUsernameKey(username)
    const secureKey = await securePasswordKey(username, password)
    const secureKeyAddress = await secureKey.address()

    log("creating user chaintree")
    const userTree = await ChainTree.newEmptyTree(c.blockservice, insecureKey)

    log("fetching user database")
    const dbInstance = await getOrbitInstance(userTree)

    log("creating user tweet feed")
    const feed = await TweetFeed.create(dbInstance)

    log("transferring ownership of user chaintree and registering tweet feed")
    await txsWithCommunityWait(userTree, [
        // Set the ownership of the user chaintree to our secure key (thus
        // owning the username)
        setOwnershipTransaction([secureKeyAddress]),

        // Cache the username inside of the chaintree for easier access later
        setDataTransaction(usernamePath, username),

        // Register the tweet feed with the user tree
        setDataTransaction(feedAddressPath, feed.address().toString())
    ])

    userTree.key = secureKey

    return userTree
}

/**
 * Find the username from the given user account ChainTree
 */
export const resolveUsername = async (tree: ChainTree) => {
    log("fetching username")
    const usernameResp = await tree.resolveData(usernamePath)
    if (usernameResp.remainderPath.length && usernameResp.remainderPath.length > 0) {
        return ""
    } else {
        return usernameResp.value
    }
}
