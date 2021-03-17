import publicIp from 'public-ip'

/**
 * Get the public IPv4 address of the local machine
 */
export const getMyPublicIp = async () => {
  const ip = await publicIp.v4()
  return ip
}