import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import OrbitDB from "orbit-db"
import FeedStore from "orbit-db-feedstore"
import { txsWithCommunityWait } from "./appcommunity";
import { EventEmitter } from "events";
import { IAppInitialTweets, IAppMessage, AppActions } from "state/store";

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
    dispatch?:Function
    last?:LogEntry<Tweet>

    constructor(feed: FeedStore<Tweet>) {
        super()
        console.log("feed")
        this.feed = feed
        console.log("database ready: ", this.feed.iterator().collect())

        this.feed.events.on('write', () => this.onWrite() )
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

    publish(msg: string) {
        return this.feed.add({
            message: msg,
            time: Date.now()
        })
    }

    onWrite() {
        log("onWrite")
        let next = this.feed.iterator({reverse: true}).next()
        this.last = next.value //TODO: is this right?
        this.dispatchTweet(next.value.payload.value)
    }

    dispatchTweet(tweet:Tweet) {
        if (!this.dispatch) {
            log("no dispatch, returning")
            return
        }
        log("dispatching")
        this.dispatch({
            type: AppActions.message,
            body: tweet.message,
        } as IAppMessage)
    }

    setDispatch(fn:Function) {
        this.dispatch = fn
        const iterator = this.feed.iterator({limit: -1})
        let next = iterator.next()

        while (next && !next.done) {
            this.last = next.value
            this.dispatchTweet(next.value.payload.value)
            next = iterator.next()
        } 
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
