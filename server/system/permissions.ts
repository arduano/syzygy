export type DenoSysPermission =
  | "hostname"
  | "osRelease"
  | "osUptime"
  | "loadavg"
  | "networkInterfaces"
  | "systemMemoryInfo"
  | "uid"
  | "gid";

export interface DenoPermissions {
  // File system permissions
  allowRead?: true | string[];
  denyRead?: string[];
  allowWrite?: true | string[];
  denyWrite?: string[];

  // Network permissions
  allowNet?: true | string[];
  denyNet?: string[];

  // Environment permissions
  allowEnv?: true | string[];
  denyEnv?: string[];

  // System information permissions
  allowSys?: true | DenoSysPermission[];
  denySys?: DenoSysPermission[];

  // Subprocess permissions
  allowRun?: true | string[];
  denyRun?: string[];

  // FFI permissions
  allowFfi?: true | string[];
  denyFfi?: string[];

  // Import permissions
  allowImport?: true | string[];

  // Script permissions
  allowScripts?: true | string[];
  denyScripts?: string[];
}

export function mergePermissions(a: DenoPermissions, b: DenoPermissions): DenoPermissions {
  const mergeArrays = (a: true | string[] | undefined, b: true | string[] | undefined): true | string[] | undefined => {
    if (a === true || b === true) return true;
    if (!a) return b;
    if (!b) return a;
    return [...new Set([...a, ...b])];
  };

  return {
    allowRead: mergeArrays(a.allowRead, b.allowRead),
    denyRead: [...new Set([...(a.denyRead || []), ...(b.denyRead || [])])],
    allowWrite: mergeArrays(a.allowWrite, b.allowWrite),
    denyWrite: [...new Set([...(a.denyWrite || []), ...(b.denyWrite || [])])],
    allowNet: mergeArrays(a.allowNet, b.allowNet),
    denyNet: [...new Set([...(a.denyNet || []), ...(b.denyNet || [])])],
    allowEnv: mergeArrays(a.allowEnv, b.allowEnv),
    denyEnv: [...new Set([...(a.denyEnv || []), ...(b.denyEnv || [])])],
    allowSys: mergeArrays(a.allowSys, b.allowSys) as true | DenoSysPermission[] | undefined,
    denySys: [...new Set([...(a.denySys || []), ...(b.denySys || [])])] as DenoSysPermission[],
    allowRun: mergeArrays(a.allowRun, b.allowRun),
    denyRun: [...new Set([...(a.denyRun || []), ...(b.denyRun || [])])],
    allowFfi: mergeArrays(a.allowFfi, b.allowFfi),
    denyFfi: [...new Set([...(a.denyFfi || []), ...(b.denyFfi || [])])],
    allowImport: mergeArrays(a.allowImport, b.allowImport),
    allowScripts: mergeArrays(a.allowScripts, b.allowScripts),
    denyScripts: [...new Set([...(a.denyScripts || []), ...(b.denyScripts || [])])],
  };
}

export function buildDenoPermissionFlags(
  permissions: DenoPermissions
): string[] {
  const flags: string[] = [];

  // Helper function to add permission flags
  const addPermissionFlag = (
    flag: string,
    allowed?: true | string[],
    denied?: string[]
  ) => {
    if (allowed === true) {
      flags.push(`--allow-${flag}`);
    } else if (Array.isArray(allowed) && allowed.length) {
      flags.push(`--allow-${flag}=${allowed.join(",")}`);
    }
    if (denied?.length) {
      flags.push(`--deny-${flag}=${denied.join(",")}`);
    }
  };

  // Add all permission flags
  addPermissionFlag("read", permissions.allowRead, permissions.denyRead);
  addPermissionFlag("write", permissions.allowWrite, permissions.denyWrite);
  addPermissionFlag("net", permissions.allowNet, permissions.denyNet);
  addPermissionFlag("env", permissions.allowEnv, permissions.denyEnv);
  addPermissionFlag("sys", permissions.allowSys, permissions.denySys);
  addPermissionFlag("run", permissions.allowRun, permissions.denyRun);
  addPermissionFlag("ffi", permissions.allowFfi, permissions.denyFfi);
  addPermissionFlag(
    "scripts",
    permissions.allowScripts,
    permissions.denyScripts
  );

  if (permissions.allowImport === true) {
    flags.push(`--import`);
  } else if (
    Array.isArray(permissions.allowImport) &&
    permissions.allowImport.length
  ) {
    flags.push(`--import=${permissions.allowImport.join(",")}`);
  }

  return flags;
}
