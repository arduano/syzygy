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

export function mergePermissions(...permissions: DenoPermissions[]): DenoPermissions {
  const mergeArrays = (arrays: (true | string[] | undefined)[]): true | string[] | undefined => {
    if (arrays.some(a => a === true)) return true;
    const validArrays = arrays.filter((a): a is string[] => Array.isArray(a));
    return validArrays.length ? [...new Set(validArrays.flat())] : undefined;
  };

  const mergeDenyArrays = (arrays: string[][]): string[] => {
    return [...new Set(arrays.flat())];
  };

  const mergeSysArrays = (arrays: (true | DenoSysPermission[] | undefined)[]): true | DenoSysPermission[] | undefined => {
    if (arrays.some(a => a === true)) return true;
    const validArrays = arrays.filter((a): a is DenoSysPermission[] => Array.isArray(a));
    return validArrays.length ? [...new Set(validArrays.flat())] : undefined;
  };

  return {
    allowRead: mergeArrays(permissions.map(p => p.allowRead)),
    denyRead: mergeDenyArrays(permissions.map(p => p.denyRead || [])),
    allowWrite: mergeArrays(permissions.map(p => p.allowWrite)),
    denyWrite: mergeDenyArrays(permissions.map(p => p.denyWrite || [])),
    allowNet: mergeArrays(permissions.map(p => p.allowNet)),
    denyNet: mergeDenyArrays(permissions.map(p => p.denyNet || [])),
    allowEnv: mergeArrays(permissions.map(p => p.allowEnv)),
    denyEnv: mergeDenyArrays(permissions.map(p => p.denyEnv || [])),
    allowSys: mergeSysArrays(permissions.map(p => p.allowSys)),
    denySys: mergeDenyArrays(permissions.map(p => p.denySys || [])) as DenoSysPermission[],
    allowRun: mergeArrays(permissions.map(p => p.allowRun)),
    denyRun: mergeDenyArrays(permissions.map(p => p.denyRun || [])),
    allowFfi: mergeArrays(permissions.map(p => p.allowFfi)),
    denyFfi: mergeDenyArrays(permissions.map(p => p.denyFfi || [])),
    allowImport: mergeArrays(permissions.map(p => p.allowImport)),
    allowScripts: mergeArrays(permissions.map(p => p.allowScripts)),
    denyScripts: mergeDenyArrays(permissions.map(p => p.denyScripts || [])),
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
