import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import { txsWithCommunityWait } from "./appcommunity";

const log = debug("tweet")

/**
 * The prefix of paths within the user's ChainTree where the application stores
 * their tweets and tweet metadata.
 */
const tweetPrefix = appDataPrefix + "/tweets"

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
