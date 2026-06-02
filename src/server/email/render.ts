type Context = Record<string, unknown>;

export function renderTemplate(template: string, ctx: Context): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as object)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, ctx);
    return value === undefined || value === null ? "" : String(value);
  });
}
