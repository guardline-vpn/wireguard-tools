import util from 'util'
import childProcess from 'child_process'

const execute = util.promisify(childProcess.exec)

interface Options {
  /** Function to run when data is returned from exec */
  onData?: (data: string) => any
  /** Function to run when error occurs */
  onError?: (err: string) => any
  /** Function to run when exec ends */
  onClose?: (code: number) => any
}

/**
 * A better exec with promises etc.
 */
export const exec = async (command: string, opts?: Options) => {
  const promise = execute(command)
  const child = promise.child
  if (opts) {
    const { onData, onError, onClose } = opts
    if (onData && typeof opts.onData === 'function') {
      child.stdout?.on('data', (data: string) => onData(data))
    }
    if (onError && typeof opts.onError === 'function') {
      child.stderr?.on('data', (data: string) => onError(data))
    }
    if (onClose && typeof opts.onClose === 'function') {
      child.on('close', (code: number) => onClose(code))
    }
  }

  // i.e. can then await for promisified exec call to complete
  const { stdout, stderr } = await promise
  if (stderr) throw new Error(stderr)
  return stdout
}