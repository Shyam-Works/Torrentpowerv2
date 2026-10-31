import { getAllData, itemsAsObject } from "@/lib/data";

// Public: lists the order form needs. Office Sloc codes stay server-side.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
  try {
    const data = await getAllData();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      engineers: data.engineers,
      vendors: data.vendors,
      stores: data.stores.map((s) => s.name),
      items: itemsAsObject(data.items),
    });
  } catch (err) {
    console.error("Config error:", err);
    res.status(500).json({ error: "Could not load form data." });
  }
}
