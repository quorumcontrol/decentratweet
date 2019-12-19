import { debug } from "debug";
import { appDataPrefix } from "./data"
import { ChainTree, setDataTransaction } from "tupelo-wasm-sdk";
import OrbitDB from "orbit-db"
import FeedStore from "orbit-db-feedstore"
import { EventEmitter } from "events";

const log = debug("tweet")

const feedName = "tweets"


/**
 * Object representing a tweet
 */
export interface Tweet {
    name?:string,
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
    username:string

    constructor(feed: FeedStore<Tweet>, username:string) {
        super()
        console.log("feed")
        this.feed = feed
        this.username = username
        feed.events.on('write', ()=> {log("feed written"); this.emit("new")})
        feed.events.on('replicated', ()=> {log("feed replicated"); this.emit("new")})
    }

    static async create(userName:string, db: OrbitDB) {
        log("Creating tweet feed")
        const f = await db.feed<Tweet>(feedName)
        return new TweetFeed(f, userName)
    }

    static async open(username:string, db: OrbitDB, address: string) {
        log("opening tweet feed at address " + address)
        const f = await db.feed<Tweet>(address)
        await f.load()

        return new TweetFeed(f, username)
    }

    publish(msg: string) {
        return this.feed.add({
            message: msg,
            time: Date.now()
        })
    }

    all() {
        return this.feed.iterator({limit: -1}).collect().map((logEntry)=> {
            const tweet = logEntry.payload.value
            tweet.time = new Date(tweet.time)
            tweet.name = this.username
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
