import { checkCredentials, setSessionCookie, clearSessionCookie, isAdmin } from "@/lib/auth";

export default function handler(req, res) {
  try {
    if (req.method === "GET") return res.status(200).json({ loggedIn: isAdmin(req) });
    if (req.method === "DELETE") {
      clearSessionCookie(res);
      return res.status(200).json({ loggedIn: false });
    }
    if (req.method === "POST") {
      const { email, password } = req.body || {};
      if (!checkCredentials(email, password))
        return res.status(401).json({ error: "Wrong email or password." });
      setSessionCookie(res);
      return res.status(200).json({ loggedIn: true });
    }
    res.status(405).send("Method Not Allowed");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Admin login is not configured on the server." });
  }
}
