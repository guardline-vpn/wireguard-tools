import path from 'path'

/**
 * Get a wireguard interface name from the config file path
 */
export const getInterfaceNameFromFile = (filePath: string) => {
  return path.basename(filePath, '.conf')
}
