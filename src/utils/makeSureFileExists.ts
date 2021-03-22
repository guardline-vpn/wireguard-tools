import f from 'fs'
const fs = f.promises
/** make sure a file exists on the file system */
export const makeSureFileExists = async (path: string) => {
  try {
    (await fs.stat(path))?.isFile()
  } catch (e) {
    await fs.writeFile(path, '')
  }
}