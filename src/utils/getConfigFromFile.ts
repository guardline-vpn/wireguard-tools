import f from 'fs'
const fs = f.promises
import { parseConfigString } from './configParser'

interface Options {
  /** Full, absolute path to file including file name and extension */
  filePath: string
}

/**
 * Get a wireguard config file as a string
 */
export const getConfigStringFromFile = async (opts: Options) => {
  const string = await fs.readFile(opts.filePath, { encoding: 'utf-8' })
  return string
}

/**
 * Get a wireguard config file as a parsed object
 */
export const getConfigObjectFromFile = async (opts: Options) => {
  const string = await fs.readFile(opts.filePath, { encoding: 'utf-8' })
  const obj = parseConfigString(string)
  return obj
}