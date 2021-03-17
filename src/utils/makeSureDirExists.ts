import fs from 'fs/promises'

/** Make sure a directory exists on the file system */
export const makeSureDirExists = async (path: string) => {
  try {
    (await fs.stat(path))?.isDirectory()
  } catch (e) {
    fs.mkdir(path, { recursive: true })
  }
}