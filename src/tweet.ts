import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import OrbitDB from "orbit-db"
import FeedStore from "orbit-db-feedstore"
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

    static async open(db: OrbitDB, address: string) {
        log("opening tweet feed at address " + address)
        const f = await db.feed<Tweet>(address)

        return new TweetFeed(f)
    }

    async publish(msg: string) {
        await this.feed.add({
            message: msg,
            time: Date.now()
        })
    }

    address() {
        return this.feed.address
    }
}

/**
 * The path of the array of followed user array
 */
const followedPath = appDataPrefix + "/followed"

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
