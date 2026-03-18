import type { PropertyInfo } from "./types";

export type ChangeType = "added" | "removed" | "changed" | "unchanged";

export interface PropertyDiff {
  name: string;
  change: ChangeType;
  old?: PropertyInfo;
  new?: PropertyInfo;
  details?: string[];
  nested?: PropertyDiff[];
}

function diffProperties(
  oldProps: PropertyInfo[],
  newProps: PropertyInfo[]
): PropertyDiff[] {
  const oldMap = new Map(oldProps.map((p) => [p.name, p]));
  const newMap = new Map(newProps.map((p) => [p.name, p]));
  const allNames = new Set([...oldMap.keys(), ...newMap.keys()]);
  const diffs: PropertyDiff[] = [];

  for (const name of allNames) {
    const oldProp = oldMap.get(name);
    const newProp = newMap.get(name);

    if (!oldProp && newProp) {
      diffs.push({ name, change: "added", new: newProp });
    } else if (oldProp && !newProp) {
      diffs.push({ name, change: "removed", old: oldProp });
    } else if (oldProp && newProp) {
      const details: string[] = [];

      if (oldProp.type !== newProp.type) {
        details.push(`Type: ${oldProp.type} → ${newProp.type}`);
      }
      if (oldProp.format !== newProp.format) {
        details.push(
          `Format: ${oldProp.format ?? "none"} → ${newProp.format ?? "none"}`
        );
      }
      if (oldProp.required !== newProp.required) {
        details.push(
          newProp.required ? "Made required" : "Made optional"
        );
      }
      if (oldProp.description !== newProp.description) {
        details.push("Description changed");
      }

      // Compare enum values
      const oldEnums = oldProp.enumValues?.map((e) => e.value).sort().join(",");
      const newEnums = newProp.enumValues?.map((e) => e.value).sort().join(",");
      if (oldEnums !== newEnums) {
        details.push("Enum values changed");
      }

      // Recurse into nested
      let nestedDiffs: PropertyDiff[] | undefined;
      if (oldProp.nested || newProp.nested) {
        nestedDiffs = diffProperties(
          oldProp.nested ?? [],
          newProp.nested ?? []
        );
        if (nestedDiffs.every((d) => d.change === "unchanged")) {
          nestedDiffs = undefined;
        }
      }

      const change: ChangeType =
        details.length > 0 || nestedDiffs ? "changed" : "unchanged";

      diffs.push({
        name,
        change,
        old: oldProp,
        new: newProp,
        details: details.length > 0 ? details : undefined,
        nested: nestedDiffs,
      });
    }
  }

  return diffs;
}

export function compareSchemas(
  oldProps: PropertyInfo[],
  newProps: PropertyInfo[]
): { diffs: PropertyDiff[]; summary: { added: number; removed: number; changed: number } } {
  const diffs = diffProperties(oldProps, newProps);

  function countChanges(items: PropertyDiff[]): { added: number; removed: number; changed: number } {
    let added = 0, removed = 0, changed = 0;
    for (const d of items) {
      if (d.change === "added") added++;
      else if (d.change === "removed") removed++;
      else if (d.change === "changed") changed++;
      if (d.nested) {
        const sub = countChanges(d.nested);
        added += sub.added;
        removed += sub.removed;
        changed += sub.changed;
      }
    }
    return { added, removed, changed };
  }

  return { diffs, summary: countChanges(diffs) };
}
