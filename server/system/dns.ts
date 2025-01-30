import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";

const execAsync = promisify(exec);

async function getDnsServersWindows(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("ipconfig /all");
    const dnsServers: string[] = [];

    // Split by lines, trim them
    const lines = stdout.split("\n").map((line) => line.trim());

    // We'll capture DNS servers that appear after lines that start with 'DNS Servers'
    // or as subsequent indented lines:
    let collecting = false;
    for (const line of lines) {
      // Example line might look like: "DNS Servers . . . . . . . . . . . : 8.8.8.8"
      // or subsequent lines "                                          8.8.4.4"
      if (/^DNS Servers/.test(line)) {
        // Attempt to capture any IP addresses on the same line after the colon
        const match = line.match(/:\s*(.*)/);
        if (match && match[1]) {
          const possibleIPs = match[1].split(/\s+/);
          possibleIPs.forEach((ip) => {
            if (ip) dnsServers.push(ip);
          });
        }
        collecting = true;
      } else if (collecting) {
        // If the line is blank or starts with something else, stop collecting
        if (!line || /:/.test(line)) {
          collecting = false;
          continue;
        }
        // Otherwise this might be an additional DNS server line
        const possibleIPs = line.split(/\s+/);
        possibleIPs.forEach((ip) => {
          if (ip) dnsServers.push(ip);
        });
      }
    }

    // Filter out duplicates
    return Array.from(new Set(dnsServers));
  } catch (error) {
    console.error("Failed to get DNS servers on Windows:", error);
    return [];
  }
}

async function getDnsServersUnix(): Promise<string[]> {
  try {
    // Typical location for Unix-like systems
    const resolvConf = await readFile("/etc/resolv.conf", "utf8");
    const dnsServers: string[] = [];

    // Look for lines that start with "nameserver"
    const lines = resolvConf.split("\n").map((line) => line.trim());
    for (const line of lines) {
      if (line.startsWith("nameserver")) {
        // Format: "nameserver x.x.x.x"
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          dnsServers.push(parts[1]);
        }
      }
    }

    // Filter out duplicates
    return Array.from(new Set(dnsServers));
  } catch (error) {
    console.error("Failed to read /etc/resolv.conf:", error);
    return [];
  }
}

export async function getSystemDnsServers(): Promise<string[]> {
  const currentPlatform = platform();

  if (currentPlatform === "win32") {
    return await getDnsServersWindows();
  } else {
    // For Linux (and often macOS), try /etc/resolv.conf
    return await getDnsServersUnix();
  }
}
