import { requireAdmin } from "@/lib/auth";
import { getAllData, saveSection, validateSection, SECTIONS } from "@/lib/data";

// GET: every list (including office Sloc codes).
// PUT { section, value }: replace one list.
export default requireAdmin(async (req, res) => {
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(await getAllData());
    }
    if (req.method === "PUT") {
      const { section, value } = req.body || {};
      if (!SECTIONS.includes(section)) return res.status(400).json({ error: "Unknown section." });
      const result = validateSection(section, value);
      if (result.error) return res.status(400).json({ error: result.error });
      await saveSection(section, result.value);
      return res.status(200).json({ section, value: result.value });
    }
    res.status(405).send("Method Not Allowed");
  } catch (err) {
    console.error("Admin data error:", err);
    res.status(500).json({ error: "Could not reach the database." });
  }
});
