import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import { resolveUsername } from "./identity"
import { txsWithCommunityWait } from "./appcommunity";

const log = debug("tweet")

/**
 * The prefix of paths within the user's ChainTree where the application stores
 * their tweets and tweet metadata.
 */
const tweetPrefix = appDataPrefix + "/tweets"

/**
 * The path of the array of followed user array
 */
const followedPath = appDataPrefix + "/followed"

/**
 * The path within the user's ChainTree that stores the number of tweets they've
 * written
 */
const countPath = tweetPrefix + "/count"

/**
 * Returns the current tweet count stored in the user ChainTree
 */
const tweetCount = async (userTree: ChainTree) => {
    log("fetching the current tweet count")
    const countResp = await userTree.resolveData(countPath)
    if (countResp.remainderPath.length && countResp.remainderPath.length > 0) {
        return 0
    } else {
        return countResp.value
    }
}

/**
 * Return the path for a tweet with the given count
 */
const tweetPath = (count: number) => {
    return tweetPrefix + "/" + count
}

/**
 * Return an object representing a tweet and its metadata
 */
const newTweet = (msg: string, ts: number) => {
    return {
        message: msg,
        time: ts
    }
}

/**
 * Record a tweet in the provided ChainTree
 */
export const saveTweet = async (userTree: ChainTree, msg: string) => {
    // record the current timestamp to store with the tweet
    const ts = Date.now()

    // create a transaction to increment the current tweet count
    const currentCount = await tweetCount(userTree)
    const newCount = currentCount + 1
    const incrementCountTx = setDataTransaction(countPath, newCount)

    // create a transaction to record the tweet
    const tweet = newTweet(msg, ts)
    const path = tweetPath(newCount)
    const tweetTx = setDataTransaction(path, tweet)

    // build the block of transactions to both increment the tweet count and
    // save the new tweet
    const tweetBlock = [incrementCountTx, tweetTx]

    log("playing tweet transaction onto user tree")
    await txsWithCommunityWait(userTree, tweetBlock)
}

const resolveTweet = async (num: number, tree: ChainTree) => {
    const path = tweetPath(num)
    const tweetResp = await tree.resolveData(path)
    if (tweetResp.remainderPath.length && tweetResp.remainderPath.length > 0) {
        return null
    } else {
        return tweetResp.value
    }
}

/**
 * Fetch all the tweets in a user chaintree, returning an array of tweet objects
 * (including the username)
 */
export const readTweets = async (tree: ChainTree) => {
    const username = await resolveUsername(tree)
    if (username === "") {
        return []
    }

    const count = await tweetCount(tree)
    if (count === 0) {
        return []
    }

    let tweets = []
    for (let i = 0; i < count; i++) {
        const tweet = await resolveTweet(i, tree)
        if (tweet !== null) {
            tweets.push({
                username: username,
                message: tweet.message,
                time: tweet.time
            })
        }
    }

    return tweets
}

export const followed = async (userTree: ChainTree) => {
    log("fetching the current followed list")
    const followedResp = await userTree.resolveData(followedPath)
    if (followedResp.remainderPath.length && followedResp.remainderPath.length > 0) {
        return []
    } else {
        return followedResp.value
    }
}

/**
 * Follow another user's tweets
 */
export const follow = async (userTree: ChainTree, followedUser: string) => {
    const currentFollowed = await followed(userTree)

    currentFollowed.push(followedUser)
    const newFollowedTx = setDataTransaction(followedPath, currentFollowed)

    await txsWithCommunityWait(userTree, [newFollowedTx])
}
