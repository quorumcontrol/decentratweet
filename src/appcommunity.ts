import { Community, ChainTree } from "tupelo-wasm-sdk";
import CID from "cids";
import debug from "debug";
import { Transaction } from "tupelo-messages";

const log = debug("appcommunity")

let _appPromise: Promise<Community>

/**
 * Return the community instance to be used by all modules of the application,
 * after initializing it if necessary based on the application deployment
 * environment
 */
export function getAppCommunity(): Promise<Community> {
    log("fetching app community")
    if (_appPromise !== undefined) {
        return _appPromise
    }
    _appPromise = new Promise(async (resolve, reject) => {
        let c: Community
        switch (process.env.NODE_ENV) {
            case "production":
                log("using production community")
                c = await Community.getDefault()
                break;
            default:
                log("using development community")
                c = await Community.freshLocalTestCommunity()
        }
        resolve(c)
    })
    return _appPromise
}

/**
 * Returns a promise that resolves when the apps community instance updates the
 * ChainTree specified by did to the expected tip tip
 */
export function waitForCommunityTip(did: string, tip: CID) { // for some reason can't use CID as a type here easily
    return new Promise((resolve, reject) => {
        log("waiting for community on ", did)
        let count = 0
        const doCheck = async () => {
            const c = await getAppCommunity()
            log("waitForCommunityTip: awaitng nextUpdate")
            await c.nextUpdate()
            log("waitForCommunityTip: getTip")
            let cTip: CID
            try {
                cTip = await c.getTip(did)
            } catch (e) {
                if (e === "not found") {
                    setTimeout(doCheck, 200)
                    return
                }
                throw new Error(e)
            }
            if (tip.equals(cTip)) {
                log("tips matched", did)
                resolve()
                return
            }
            if (count > 60) {
                log("waitForCommunityTip: rejecting timeout ", did)
                reject(new Error("timeout error, over 30s"))
                return
            }
            count++
            log("tips did not match, retrying", did)
            setTimeout(doCheck, 500)
        }
        doCheck()
    })
}

/**
 * Play transactions against tree and then wait for the app's community instance
 * to pic up the changes
 */
export async function txsWithCommunityWait(tree: ChainTree, txs: Transaction[]) {
    const c = await getAppCommunity()
    const res = await c.playTransactions(tree, txs)
    const sig = res.getSignature()
    if (sig === undefined) {
        throw new Error("undefined sig from response")
    }
    const respTip = new CID(Buffer.from(sig.getNewTip_asU8()))

    const treeId = await tree.id()
    if (treeId === null) {
        throw new Error("error getting ID, was null")
    }

    await waitForCommunityTip(treeId, respTip)
    return res
}
