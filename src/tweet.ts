import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import OrbitDB from "orbit-db"
import FeedStore from "orbit-db-feedstore"
import { txsWithCommunityWait } from "./appcommunity";
import { EventEmitter } from "events";

const log = debug("tweet")

const feedName = "tweets"


/**
 * Object representing a tweet
 */
export interface Tweet {
    message: string,
    time: Date
}

// interface feedIterator {
//     next(): { value: LogEntry<Tweet>, done: boolean }
// }

/**
 * A feed of a user's tweets
 */
export class TweetFeed extends EventEmitter {
    feed: FeedStore<Tweet>
    last?:LogEntry<Tweet>

    constructor(feed: FeedStore<Tweet>) {
        super()
        console.log("feed")
        this.feed = feed
        feed.events.on('write', ()=> {this.onWrite()})
    }

    static async create(db: OrbitDB) {
        log("Creating tweet feed")
        const f = await db.feed<Tweet>(feedName)
        return new TweetFeed(f)
    }

    static async open(db: OrbitDB, address: string) {
        log("opening tweet feed at address " + address)
        const f = await db.feed<Tweet>(address)
        await f.load()

        return new TweetFeed(f)
    }

    publish(msg: string) {
        return this.feed.add({
            message: msg,
            time: Date.now()
        })
    }

    onWrite() {
        this.emit("write")
    }

    all() {
        return this.feed.iterator({limit: -1}).collect().map((logEntry)=> {
            const tweet = logEntry.payload.value
            tweet.time = new Date(tweet.time)
            return tweet
        })
    }

    close() {
        return this.feed.close()
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
