import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import OrbitDB from "orbit-db"
import FeedStore from "orbit-db-feedstore"
import { resolveUsername } from "./identity"
import { txsWithCommunityWait } from "./appcommunity";

const log = debug("tweet")

const feedName = "tweets"

/**
 * Object representing a tweet
 */
export interface Tweet {
    message: string,
    time: Date
}

/**
 * A feed of a user's tweets
 */
export class TweetFeed {
    feed: FeedStore<Tweet>

    constructor(feed: FeedStore<Tweet>) {
        this.feed = feed
    }

    static async create(db: OrbitDB) {
        log("Creating tweet feed")
        const f = await db.feed<Tweet>(feedName)

        return new TweetFeed(f)
    }

    async publish(msg: string) {
        await this.feed.add({
            message: msg,
            time: Date.now()
        })
    }
}

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
