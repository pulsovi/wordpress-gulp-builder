import path from "path";

/**
 * Robustly load a module in an ESM environment using multiple strategies.
 * Returns either { module } or { errors } listing the failed attempts.
 * @unreleased
 */
export async function loadModule(
  name: string
): Promise<{ module: any } | { errors: { method: string; error: Error }[] }> {
  /**
   * Accumulated errors during attempts
   * @unreleased
   */
  const errors: { method: string; error: Error }[] = [];

  // 1) Standard dynamic import
  try {
    /**
     * Dynamically imported ESM namespace
     * @unreleased
     */
    const ns = await (Function(
      `return import(${JSON.stringify(name)})`
    )() as Promise<any>);
    return { module: ns?.default ?? ns };
  } catch (e: any) {
    errors.push({ method: "dynamic_import", error: e });
  }

  // 2) createRequire from this module (near the tool's dist)
  try {
    const mod = await import("module");
    const createRequire = (mod as any).createRequire;
    const requireHere = createRequire(import.meta.url);
    const m = requireHere(name);
    return { module: m?.default ?? m };
  } catch (e: any) {
    errors.push({ method: "require_here", error: e });
  }

  // 3) createRequire from CWD (consumer project)
  try {
    const mod = await import("module");
    const createRequire = (mod as any).createRequire;
    const requireCwd = createRequire(path.join(process.cwd(), "package.json"));
    const m = requireCwd(name);
    return { module: m?.default ?? m };
  } catch (e: any) {
    errors.push({ method: "require_cwd", error: e });
  }

  // 4) require.resolve with explicit paths -> require
  try {
    const mod = await import("module");
    const createRequire = (mod as any).createRequire;
    const requireHere = createRequire(import.meta.url);
    const resolved = requireHere.resolve(name, { paths: [process.cwd()] });
    const m = requireHere(resolved);
    return { module: m?.default ?? m };
  } catch (e: any) {
    errors.push({ method: "require_resolve_paths", error: e });
  }

  return { errors };
}
