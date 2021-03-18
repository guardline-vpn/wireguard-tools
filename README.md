# Wireguard tools for Nodejs

This lib includes a class and set of helper functions for working with WireGuard config files in javascript/typescript.

100% Typescript!

[Check out the docs](https://guardline-vpn.github.io/wireguard-tools/) with 💖 from [typedoc](https://typedoc.org/):

[https://guardline-vpn.github.io/wireguard-tools/](https://guardline-vpn.github.io/wireguard-tools/)

## To use

`npm i wireguard-tools`

or

`yarn add wireguard-tools`

### Basic config

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig({
  wgInterface: { address: ['10.10.1.1'] },
  filePath
})

await config1.generateKeys()

```

### Generate Keys

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig({
  wgInterface: {
    address: ['10.10.1.1']
  },
  filePath
})

const { publicKey, preSharedKey, privateKey } = await config1.generateKeys({ preSharedKey: true })

```

### Write to disk

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig({
  wgInterface: {
    address: ['10.10.1.1']
  },
  filePath
})

await config1.generateKeys()
await config1.writeToFile()

```

### Parse config from disk

```ts
import path from 'path'
import { WgConfig, getConfigObjectFromFile } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const thatConfigFromFile = await getConfigObjectFromFile({ filePath })

const config1 = new WgConfig({
  ...thatConfigFromFile,
  filePath
})

// OR:
const config2 = new WgConfig({ filePath })
await config2.parseFile()

// OR:
const config3 = new WgConfig()
await config3.parseFile(filePath)

// Public key will not be available because it's not saved in the WireGuard config,
// so you need to generate keys again (it will use the existing private key)
await config1.generateKeys()
```

### Bring up /bring down a WgConfig as a WireGuard interface

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig({
  wgInterface: {
    address: ['10.10.1.1']
  },
  filePath
})

await config1.generateKeys()
await config1.writeToFile()

// bring up
await config1.up()

// bring down
await config1.down()
```

### To change a WgConfig while up, you need to restart

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig()
// Assuming the WireGuard config file is already on disk...
await config1.parseFile(filePath)

await config1.generateKeys()

// bring up
await config1.up()

// create new key pair
await config1.generateKeys({ overwrite: true })
// change the name
config1.wgInterface.name = 'new-name'

// write the file to save
await config1.writeToFile()

// restart for the changes to take effect
await config1.restart()
```

### Or use the save() shorcut method to write and restart

Note, using this method will start the WireGuard interface if it's down unless `{ noUp: true }` is passed in.

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const config1 = new WgConfig()
// Assuming the WireGuard config file is already on disk...
await config1.parseFile(filePath)

await config1.generateKeys()

// bring up
await config1.up()

// create new key pair
await config1.generateKeys({ overwrite: true })
// change the name
config1.wgInterface.name = 'new-name'

// write the file and restart
await config1.save()
```

### Generate and add peers from and to configs

```ts
import path from 'path'
import { WgConfig } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')
const filePath2 = path.join(__dirname, '/configs', '/guardline-client.conf')

const server = new WgConfig({
  wgInterface: { address: ['10.10.1.1'] },
  filePath
})

const client = new WgConfig({
  wgInterface: { address: ['10.10.1.2'] },
  filePath: filePath2
})

// gen keys
await Promise.all([
  server.generateKeys({ preSharedKey: true }),
  client.generateKeys({ preSharedKey: true })
])

// make a peer from server
const serverAsPeer = server.createPeer({
  allowedIps: ['10.1.1.1/32'],
  preSharedKey: server.preSharedKey
})

// add that as a peer to client
client.addPeer(serverAsPeer)

// make a peer from client and add it to server
server.addPeer(client.createPeer({
  allowedIps: ['10.10.1.1/32'],
  preSharedKey: client.preSharedKey
}))
```

### Or use the createPeerPairs tool to do this with ease

```ts
import path from 'path'
import { WgConfig, createPeerPairs } from 'wireguard-tools'

// make a load of configs
let configs: WgConfig[] = []

for (let i = 1; i <= 10; i++) {
  configs.push(new WgConfig({
    wgInterface: {
      address: [`10.10.1.${i}`],
      name: `Client-${i}`
    },
    filePath: path.join(__dirname, '/configs', `/guardline-${i}.conf`)
  }))
}

// get their key pairs
await Promise.all(configs.map(x => x.generateKeys()))

// add them all as peers of each other
createPeerPairs(configs.map(x => {
  return {
    config: x,
    peerSettings: {
      allowedIps: ['10.10.1.1/32']
    }
  }
}))

// write them all to disk
await Promise.all(configs.map(x => x.writeToFile()))

```

### Or more advanced

```ts
import path from 'path'
import { WgConfig, createPeerPairs } from 'wireguard-tools'

// make a load of configs
let configs: WgConfig[] = []

for (let i = 1; i <= 10; i++) {
  configs.push(new WgConfig({
    wgInterface: {
      address: [`10.10.1.${i}`],
      privateKey: '',
      name: `Client-${i}`
    },
    filePath: path.join(__dirname, '/configs', `/guardline-${i}.conf`)
  }))
}

// get their key pairs
await Promise.all(configs.map(x => x.generateKeys()))

// add them all as peers of each other
createPeerPairs(configs.map(x => {
  return {
    config: x,
    peerSettings: ({ thisConfig, peerConfig }) => {
      const peerAddress = peerConfig.wgInterface.address
      const peerPresharedKey = peerConfig.preSharedKey
      return {
        allowedIps: peerAddress,
        preSharedKey: peerPresharedKey,
        name: peerConfig.wgInterface.name,
        persistentKeepalive: thisConfig.wgInterface.address.includes('10.10.1.1') ? 25 : undefined
      }
    }
  }
}))

// write them all to disk
await Promise.all(configs.map(x => x.writeToFile()))

```

### Random helpers

```ts
import path from 'path'
import {
  checkWgIsInstalled,
  generateKeyPair,
  generateConfigString,
  parseConfigString,
  getConfigStringFromFile,
  getConfigObjectFromFile,
} from ''


// check WireGuard is installed on the system and print version
const version = await checkWgIsInstalled()
console.log(version) // wireguard-tools v1.0.20200827 - https://git.zx2c4.com/wireguard-tools/


// generate a WG key pair (needs wg installed on system)
const { publicKey, privateKey, preSharedKey } = await generateKeyPair({ preSharedKey: true })
console.log({ publicKey, privateKey, preSharedKey })
/**
 * {
 *   publicKey: '257CQncfArO8QLIcc23Hhyq2IvnBszCl8XUU9TA42Q4=',
 *   privateKey: '6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q=',
 *   preSharedKey: 'NlqKE2Ja7AAQhDZpevUwi7pjlnU7HZgcPLI0F/gVPfs='
 * }
 */


// Generate a string version of the WgConfig suitable for saving to a Wireguard Config file
const configString = generateConfigString({
  wgInterface: {
    name: 'Client 1',
    address: ['10.10.1.1'],
    privateKey: '6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q'
  },
  peers: [
    {
      allowedIps: ['10.10.1.1/32'],
      publicKey: 'FoSq0MiHw9nuHMiJcD2vPCzQScmn1Hu0ctfKfSfhp3s='
    }
  ]
})
console.log(configString)
/**
 * [Interface]
 * # Name = Client 1
 * Address = 10.10.1.1
 * PrivateKey = 6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q
 * 
 * [Peer]
 * PublicKey = FoSq0MiHw9nuHMiJcD2vPCzQScmn1Hu0ctfKfSfhp3s=
 * AllowedIPs = 10.10.1.1/32
 */


// Parse a config object from a WireGuard config file string
const configObj = parseConfigString(configString)
console.log(configObj)
/**
 * {
 *   wgInterface: {
 *     address: [ '10.10.1.1' ],
 *     privateKey: '6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q',
 *     name: 'Client 1'
 *   },
 *   peers: [
 *     {
 *       allowedIps: [Array],
 *       publicKey: 'FoSq0MiHw9nuHMiJcD2vPCzQScmn1Hu0ctfKfSfhp3s='
 *     }
 *   ]
 * }
 */


// Get a raw wireguard config string from a file
const confStringFromFile = getConfigStringFromFile({
  filePath: path.join(__dirname, '/configs', '/wg0.conf')
})
console.log(confStringFromFile)
/**
 * [Interface]
 * # Name = Client 1
 * Address = 10.10.1.1
 * PrivateKey = 6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q
 *
 * [Peer]
 * PublicKey = FoSq0MiHw9nuHMiJcD2vPCzQScmn1Hu0ctfKfSfhp3s=
 * AllowedIPs = 10.10.1.1/32
 */


// Get a parsed WgConfigObject from a wireguard config file
const confObjFromFile = getConfigObjectFromFile({
  filePath: path.join(__dirname, '/configs', '/wg0.conf')
})
console.log(confObjFromFile)
/**
 * {
 *   wgInterface: {
 *     address: [ '10.10.1.1' ],
 *     privateKey: '6AgToMLuTa3lQMIMwIBVkhwSM0PVLCZD1FpqU5y0l2Q',
 *     name: 'Client 1'
 *   },
 *   peers: [
 *     {
 *       allowedIps: [Array],
 *       publicKey: 'FoSq0MiHw9nuHMiJcD2vPCzQScmn1Hu0ctfKfSfhp3s='
 *     }
 *   ]
 * }
 */
```

### Extensive example

Here is one extensive example of usage that should give you an idea of what to do:

```ts
import path from 'path'
import { WgConfig, getConfigObjectFromFile, createPeerPairs, checkWgIsInstalled } from 'wireguard-tools'

const filePath = path.join(__dirname, '/configs', '/guardline-server.conf')

const test = async () => {
  try {
    // make a new config
    const config1 = new WgConfig({
      wgInterface: {
        address: ['10.10.1.1']
      },
      filePath
    })

    // give the config a name
    config1.wgInterface.name = 'Guardline Server'

    // update some other properties
    config1.wgInterface.postUp = ['echo "Guardline Server Up!"']
    config1.wgInterface.listenPort = 5280

    // make a keypair for the config and a pre-shared key
    const keypair = await config1.generateKeys({ preSharedKey: true })

    // these keys will be saved to the config object
    console.log(keypair.publicKey === config1.publicKey) // true
    console.log(keypair.preSharedKey === config1.preSharedKey) // true
    console.log(keypair.privateKey === config1.wgInterface.privateKey) // true

    // write the config to disk
    await config1.writeToFile()

    // read that file into another config object
    const thatConfigFromFile = await getConfigObjectFromFile({ filePath })
    const config2FilePath = path.join(__dirname, '/configs', '/guardline-server-2.conf')
    const config2 = new WgConfig({
      ...thatConfigFromFile,
      filePath: config2FilePath
    })

    // both configs private key will be the same because config2 has been parsed
    // from the file written by config
    console.log(config1.wgInterface.privateKey === config2.wgInterface.privateKey)

    // however, config2 doesn't have a public key becuase WireGuard doesn't save the
    // the public key in the config file.
    // To get the public key, you'll need to run generateKeys on config2
    // it'll keep it's private key and derive a public key from it
    await config2.generateKeys()

    // so now the two public keys will be the same
    console.log(config1.publicKey === config2.publicKey) // true

    // you can generate a new keypair by passing an arg:
    config2.generateKeys({ overwrite: true })

    // so now their public/private keys are different
    console.log(config1.publicKey === config2.publicKey) // false

    // you can create a peer object from a WgConfig like this
    const config2AsPeer = config2.createPeer({
      allowedIps: ['10.10.1.1/32']
    })

    // you can add a peer to a config like this:
    config1.addPeer(config2AsPeer)

    // and remove a peer like this
    config1.removePeer(config2.publicKey)

    // or you make two WgConfigs peers of each other like this:
    createPeerPairs([
      {
        config: config1,
        // The peer settings to apply when adding this config as a peer
        peerSettings: {
          allowedIps: ['10.10.1.1'],
          preSharedKey: config1.preSharedKey
        }
      },
      {
        config: config2,
        peerSettings: {
          allowedIps: ['10.10.1.2']
        }
      }
    ])

    // That will end up with config1 having config2 as a peer
    // and config2 having config1 as a peer
    console.log(config1.getPeer(config2.publicKey)) // logs the peer
    console.log(config2.getPeer(config1.publicKey)) // logs the peer

    // Check that the system has wireguard installed and log the version like this
    // (will throw an error if not installed)
    const wgVersion = await checkWgIsInstalled()
    console.log(wgVersion)

    // if wireguard is installed, you can bring up your config like this:
    // (make sure it's been written to file first!)
    await config1.writeToFile()
    await config1.up() // Wireguard interface is up

    // you can change something about the interface while it's up
    config1.wgInterface.dns = ['1.1.1.1']
    config1.writeToFile()

    // but make sure you restart the interface for your changes to take effect
    await config1.restart()

    // and finally, when you're done, take down the interface like this
    await config1.down()

    // Thanks for reading!
  } catch (e) {
    console.error(e)
  }
}

test()
```

## To develop

- Clone this repo
- Run `yarn`
- Run `yarn watch`

## TODO

Write more docs as always
