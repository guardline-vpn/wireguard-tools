import { generateConfigString, parseConfigString } from './utils/configParser'
import { WgConfigObject, WgConfigPeer } from './types/WgConfigObject'
import { getConfigObjectFromFile } from './utils/getConfigFromFile'
import { generateKeyPair } from './utils/generateKeyPair'
import { getMyPublicIp } from './utils/getMyPublicIp'
import { writeConfig } from './utils/writeConfig'
import mergeWith from 'lodash.mergewith'
import { exec } from './utils/exec'

interface GenerateKeysOptions {
  /** Also create a preshared key */
  preSharedKey?: boolean
  /**
   * Overwrite this object's private key if it already exists
   * 
   * If this is not set to true, a new public key will be generated from the existing private key if
   * the private key exists.
   */
  overwrite?: boolean
}

/** A Javascript object representation of a WireGuard config file with some extras */
export class WgConfig implements WgConfigObject {
  /** Defines the VPN settings for the local node. */
  wgInterface: WgConfigObject['wgInterface']
  /** An array of VPN settings for remote peers */
  peers: WgConfigObject['peers']
  /** A place to keep the public key for this node (it's not saved in the WireGuard config) */
  publicKey: WgConfigObject['publicKey']
  /** A place to keep the pre-shared key for this node (it's not saved in the WireGuard config) */
  preSharedKey: WgConfigObject['preSharedKey']

  /** The file path where this config should be written to by default */
  filePath: string

  /** creates a new WgConfig */
  constructor(init: WgConfigObject & { filePath?: string }) {
    if (init.filePath) this.filePath = init.filePath
    this.wgInterface = init.wgInterface
    this.peers = init?.peers || []
    this.preSharedKey = init?.preSharedKey
    this.publicKey = init?.publicKey
  }

  /** Return a string akin to a WireGuard config file from this WgConfig object */
  toString() {
    return generateConfigString(this)
  }

  /** JSON.stringify this WgConfig object */
  toJson() {
    return JSON.stringify(this)
  }

  /** Parse a WireGuard config file in the form of a string into this WgConfig object */
  parse(configAsString: string) {
    const parsedObj = parseConfigString(configAsString)
    Object.assign(this, parsedObj)
  }

  /** Parse a WireGuard config file from it's path in the file system */
  async parseFile(filePath?: string) {
    filePath = filePath || this.filePath
    if (!filePath) throw new Error(`No filePath found for WgConfig`)
    const res = await getConfigObjectFromFile({ filePath })
    Object.assign(this, res)
  }

  /** Write this WgConfig object as a WireGuard config file to a file in the system */
  async writeToFile(filePath?: string) {
    filePath = filePath || this.filePath
    if (!filePath) throw new Error(`No filePath found for WgConfig`)
    await writeConfig({ filePath, config: this })
  }

  /** Generate a public/private key pair for this WgConfig object */
  async generateKeys(opts?: GenerateKeysOptions) {
    const overwrite = opts?.overwrite
    const privateKey = overwrite ? undefined : this.wgInterface?.privateKey
    const preSharedKey = opts?.preSharedKey || false
    const keys = await generateKeyPair({ preSharedKey, privateKey })
    this.publicKey = keys.publicKey
    this.wgInterface.privateKey = keys.privateKey
    this.preSharedKey = keys.preSharedKey
    return keys
  }

  /** Get publicIp for this machine */
  async getPublicIp() {
    const publicIp = await getMyPublicIp()
    return publicIp
  }

  /**
   * Add a peer to the peers for this WgConfig.
   * 
   * If the peer already exists (found by public key) then it will be updated by merging the
   * existing with the new. The allowedIps will be replaced by the new peer's allowedIps unless
   * { mergeAllowedIps: true } is passed in as settings
   */
  addPeer(peer: WgConfigPeer, settings?: { mergeAllowedIps?: boolean }) {
    const mergeAllowedIps = settings?.mergeAllowedIps
    if (!this.peers) this.peers = []
    // check if peer exists by public key
    const i = this.peers.map(x => x.publicKey).indexOf(peer.publicKey)
    if (i === -1) {
      this.peers.push(peer)
    } else {
      mergeWith(this.peers[i], peer, (objValue, srcValue, key) => {
        if (key === 'allowedIps' && Array.isArray(objValue) && Array.isArray(srcValue)) {
          return mergeAllowedIps ? [...new Set([...objValue, ...srcValue])] : srcValue
        }
      })
    }
  }

  /**
   * Remove a peer if it exists in the peer array by its public key
   */
  removePeer(publicKey: string) {
    if (!this.peers) this.peers = []
    const i = this.peers.map(x => x.publicKey).indexOf(publicKey)
    if (i !== -1) {
      this.peers.splice(i, 1)
    }
  }

  /** Creates a WfgConfigPeer object from this WgCongig object */
  createPeer(settings: Omit<WgConfigPeer, 'publicKey'>) {
    if (!this.publicKey) throw new Error('WgConfig object has no public key. Run generateKeys() first')
    const peer: WgConfigPeer = {
      publicKey: this.publicKey,
      ...settings
    }
    return peer
  }

  /** Get a peer from the peer array by it's public key */
  getPeer(publicKey: string) {
    if (!publicKey) return undefined
    if (!this.peers || !this.peers.length) return undefined
    return this.peers.find(x => x.publicKey === publicKey)
  }

  /** brings up the wireguard interface */
  async up(filePath?: string) {
    filePath = filePath || this.filePath
    if (!filePath) throw new Error(`No filePath found for WgConfig`)
    let code = 0
    try {
      await exec(`wg-quick up ${filePath}`, {
        // onData: (d) => console.log(d),
        // onError: (d) => console.log(d),
        onClose: (d) => {
          console.log(`Wireguard interface ${filePath} is up`)
          code = d
        }
      })
    } catch (e) {
      if (code !== 0 && !(e.message.includes('already exists as') && e.message.includes('wg-quick'))) {
        throw e
      }
    }
  }

  /** brings down the wireguard interface */
  async down(filePath?: string) {
    filePath = filePath || this.filePath
    if (!filePath) throw new Error(`No filePath found for WgConfig`)
    let code = 0
    try {
      await exec(`wg-quick down ${filePath}`, {
        // onData: (d) => console.log(d),
        // onError: (e) => console.error(e),
        onClose: (d) => {
          console.log(`Wireguard interface ${filePath} is down`)
          code = d
        }
      })
    } catch (e) {
      if (code !== 0 && !e.message.includes('is not a WireGuard interface')) {
        throw e
      }
    }
  }

  /** restarts the wireguard interface */
  async restart(filePath?: string) {
    await this.down(filePath)
    await this.up(filePath)
  }

  /** Saves the config to file and restarts it unless `{ noUp: true }` is passed */
  async save(opts?: { filePath?: string, noUp: boolean }) {
    await this.writeToFile(opts?.filePath)
    if (!opts?.noUp) {
      await this.restart(opts?.filePath)
    }
  }
}
