import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";

const execAsync = promisify(exec);

/**
 * Retrieves DNS servers on Windows by parsing the output of `ipconfig /all`.
 */
async function getDnsServersWindows(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("ipconfig /all");
    const dnsServers: string[] = [];

    // Split output into lines and trim whitespace
    const lines = stdout.split(/\r?\n/).map((line) => line.trim());

    let collecting = false;
    for (const line of lines) {
      if (/^DNS Servers/.test(line)) {
        // Extract DNS server(s) from the current line after the colon
        const match = line.match(/:\s*(.*)/);
        if (match && match[1]) {
          const possibleIPs = match[1].split(/\s+/);
          possibleIPs.forEach((ip) => {
            if (ip) dnsServers.push(ip);
          });
        }
        collecting = true;
      } else if (collecting) {
        // Stop collecting if a new section starts or line is empty
        if (!line || /^.+?:/.test(line)) {
          collecting = false;
          continue;
        }
        // Extract additional DNS servers listed in subsequent lines
        const possibleIPs = line.split(/\s+/);
        possibleIPs.forEach((ip) => {
          if (ip) dnsServers.push(ip);
        });
      }
    }

    // Remove duplicates
    return Array.from(new Set(dnsServers));
  } catch (error) {
    console.error("Failed to get DNS servers on Windows:", error);
    return [];
  }
}

/**
 * Retrieves DNS servers on Unix-like systems by parsing `/etc/resolv.conf`.
 */
async function getDnsServersUnix(): Promise<string[]> {
  try {
    // Read the contents of /etc/resolv.conf
    const resolvConf = await readFile("/etc/resolv.conf", "utf8");
    const dnsServers: string[] = [];

    // Split the file into lines and trim whitespace
    const lines = resolvConf.split(/\r?\n/).map((line) => line.trim());

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith("#")) continue;

      // Match lines that start with 'nameserver' followed by the IP address
      const match = line.match(/^nameserver\s+(\S+)/i);
      if (match && match[1]) {
        const name = match[1];
        const withoutInterface = name.split("%")[0].trim();
        dnsServers.push(withoutInterface);
      }
    }

    // Remove duplicates
    return Array.from(new Set(dnsServers));
  } catch (error) {
    console.error("Failed to read /etc/resolv.conf:", error);
    return [];
  }
}

/**
 * Determines the current platform and retrieves DNS servers accordingly.
 */
export async function getSystemDnsServers(): Promise<string[]> {
  const currentPlatform = platform();

  if (currentPlatform === "win32") {
    return await getDnsServersWindows();
  } else {
    // For Linux, macOS, and other Unix-like systems
    return await getDnsServersUnix();
  }
}
