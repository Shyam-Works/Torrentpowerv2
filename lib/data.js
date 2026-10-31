import { getDb } from "./mongodb";
import {
  DEFAULT_ENGINEERS,
  DEFAULT_VENDORS,
  DEFAULT_STORES,
  DEFAULT_ITEMS,
} from "./defaults";

// All lists live in one collection, one document per list:
//   { _id: "engineers", value: [...] }  etc.
const COLLECTION = "settings";
export const SECTIONS = ["engineers", "vendors", "stores", "items"];

const DEFAULTS = {
  engineers: DEFAULT_ENGINEERS,
  vendors: DEFAULT_VENDORS,
  stores: DEFAULT_STORES,
  items: DEFAULT_ITEMS,
};

// Reads every list. Any list missing from the database is filled once with
// the original data, so the first deploy shows exactly what the form had before.
export async function getAllData() {
  const col = (await getDb()).collection(COLLECTION);
  const docs = await col.find({ _id: { $in: SECTIONS } }).toArray();
  const found = Object.fromEntries(docs.map((d) => [d._id, d.value]));

  for (const section of SECTIONS) {
    if (found[section] === undefined) {
      await col.updateOne(
        { _id: section },
        { $setOnInsert: { value: DEFAULTS[section], updatedAt: new Date() } },
        { upsert: true }
      );
      const doc = await col.findOne({ _id: section });
      found[section] = doc.value;
    }
  }
  return found;
}

export async function saveSection(section, value) {
  const col = (await getDb()).collection(COLLECTION);
  await col.updateOne(
    { _id: section },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
}

// ---------- validation ----------
const clean = (s) => (typeof s === "string" ? s.trim() : "");

// Returns { value } when valid, or { error } with a message for the admin.
export function validateSection(section, value) {
  if (!Array.isArray(value)) return { error: "Expected a list." };

  if (section === "engineers" || section === "vendors") {
    const list = value.map(clean);
    if (list.some((v) => !v)) return { error: "Names cannot be empty." };
    return { value: list };
  }

  if (section === "stores") {
    const list = value.map((s) => ({ name: clean(s?.name), code: clean(s?.code) }));
    if (list.some((s) => !s.name || !s.code))
      return { error: "Each office needs a name and a Sloc code." };
    const names = list.map((s) => s.name.toLowerCase());
    if (new Set(names).size !== names.length)
      return { error: "Two offices have the same name." };
    return { value: list };
  }

  if (section === "items") {
    const list = value.map((c) => ({
      category: clean(c?.category),
      items: Array.isArray(c?.items)
        ? c.items.map((i) => ({ id: clean(i?.id), name: clean(i?.name) }))
        : null,
    }));
    for (const c of list) {
      if (!c.category) return { error: "Category name cannot be empty." };
      if (!c.items) return { error: `Category "${c.category}" is invalid.` };
      if (c.items.some((i) => !i.id || !i.name))
        return { error: `Every item in "${c.category}" needs an ID and a name.` };
    }
    const cats = list.map((c) => c.category.toLowerCase());
    if (new Set(cats).size !== cats.length)
      return { error: "Two categories have the same name." };
    return { value: list };
  }

  return { error: "Unknown section." };
}

// Shape the form already uses: { [category]: [{ id, name }] }
export function itemsAsObject(items) {
  const out = {};
  for (const c of items) out[c.category] = c.items;
  return out;
}
