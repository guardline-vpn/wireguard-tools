import { exec } from "./exec"

/**
 * Checks that Wireguard is installed and available in path at 'wg' and returns the version string.
 * 
 * Will throw on Error if wg is not installed
 */
export const checkWgIsInstalled = async () => {
  try {
    const version = await exec('wg -v')
    return version
  } catch (e) {
    throw new Error('Wireguard is not installed on the system. Please install wg and wg-quick')
  }
}