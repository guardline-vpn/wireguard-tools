import publicIp from "public-ip"
import { exec } from "../utils/exec"

interface Options {
  preSharedKey: boolean
  privateKey?: string
}

interface ReturnType {
  privateKey: string
  publicKey: string
  preSharedKey?: string
}

const stripWhiteSpace = (s: string) => s.replace(/\s/g, '')

/** 
 * Generate a key pair using wg
 * optionally also generate a PreSharedKey
 */
export const generateKeyPair = async (opts?: Options) => {
  // Make the private and public key pair
  const privateKey = opts?.privateKey || await exec(`wg genkey`)
  const publicKey = await exec(`echo "${privateKey}" | wg pubkey`)

  const val: ReturnType = {
    privateKey: stripWhiteSpace(privateKey),
    publicKey: stripWhiteSpace(publicKey),
    preSharedKey: undefined
  }

  if (opts?.preSharedKey) {
    const preSharedKey = await exec(`wg genpsk`)
    val.preSharedKey = stripWhiteSpace(preSharedKey)
  }

  return val
}
