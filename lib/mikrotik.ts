// Mock Mikrotik Service

/**
 * Adds a subscriber's device MAC Address or IP to the Isolir Address List.
 */
export async function isolateClient(macAddress: string) {
  try {
    console.log(`[MIKROTIK API] Mock: Adding MAC ${macAddress} to Address List 'ISOLIR'`);
    // Example Node-RouterOS implementation:
    // const conn = new RouterOSClient({ host, user, password });
    // await conn.connect();
    // await conn.write('/ip/firewall/address-list/add', ['=list=ISOLIR', `=address=${macAddress}`]);
    // conn.close();
    
    return true;
  } catch (error) {
    console.error(`[MIKROTIK API ERROR] Failed to isolate ${macAddress}:`, error);
    // Alerting should be triggered here (e.g. Email to IT)
    return false;
  }
}

/**
 * Removes a subscriber's device from the Isolir Address List.
 */
export async function unIsolateClient(macAddress: string) {
  try {
    console.log(`[MIKROTIK API] Mock: Removing MAC ${macAddress} from Address List 'ISOLIR'`);
    return true;
  } catch (error) {
    console.error(`[MIKROTIK API ERROR] Failed to un-isolate ${macAddress}:`, error);
    return false;
  }
}
