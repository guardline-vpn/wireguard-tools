import f from 'fs'
const fs = f.promises
import path from 'path'
import { WgConfigObject } from '../types/WgConfigObject'
import { generateConfigString } from './configParser'
import { makeSureDirExists } from './makeSureDirExists'

interface Options {
  /** The full path to the file to write (use path.join to construct a full path before passing into this function) */
  filePath: string
  /** The config to write either as a string or config object */
  config: WgConfigObject | string
}

/**
 * A helper for writing a config file using fs.
 * Checks that the dir exists and creates it if not
 */
export const writeConfig = async (opts: Options) => {
  try {
    const { filePath, config } = opts
    const dir = path.dirname(filePath)
    await makeSureDirExists(dir)
    const configString = typeof config === 'string' ? config : generateConfigString(config)
    await fs.writeFile(filePath, configString)
    await fs.chmod(filePath, '600')
  } catch (e) {
    const message = `Failed to write config at path: ${opts.filePath}`
    throw new Error(`${message}\n${e}`)
  }
}