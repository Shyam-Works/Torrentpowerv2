import { useEffect, useState } from "react";
import Head from "next/head";

const TABS = [
  { key: "engineers", label: "Engineers" },
  { key: "vendors", label: "Vendors" },
  { key: "stores", label: "Offices" },
  { key: "items", label: "Items" },
];

export default function Admin() {
  const [auth, setAuth] = useState("checking"); // checking | out | in
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("engineers");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((j) => setAuth(j.loggedIn ? "in" : "out"))
      .catch(() => setAuth("out"));
  }, []);

  useEffect(() => {
    if (auth !== "in") return;
    fetch("/api/admin/data")
      .then(async (r) => {
        if (r.status === 401) return setAuth("out");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => setNotice({ type: "error", text: e.message || "Could not load data." }));
  }, [auth]);

  useEffect(() => {
    if (!notice || notice.type !== "ok") return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  // Saves one whole list. Returns true on success.
  const save = async (section, value, message) => {
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch("/api/admin/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, value }),
      });
      if (r.status === 401) {
        setAuth("out");
        return false;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData((d) => ({ ...d, [section]: j.value }));
      setNotice({ type: "ok", text: message });
      return true;
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Save failed." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setData(null);
    setAuth("out");
  };

  return (
    <div style={styles.page}>
      <Head>
        <title>Admin · Contractor Order Form</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style>{css}</style>

      {auth === "checking" && <p style={styles.muted}>Loading…</p>}
      {auth === "out" && <Login onLogin={() => setAuth("in")} />}

      {auth === "in" && (
        <>
          <header style={styles.header}>
            <h1 style={styles.title}>Order form admin</h1>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/" style={styles.linkButton}>Open form</a>
              <button onClick={logout} style={styles.secondaryButton}>Log out</button>
            </div>
          </header>

          <nav style={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                style={tab === t.key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
              >
                {t.label}
                {data && <span style={styles.count}>{countOf(data, t.key)}</span>}
              </button>
            ))}
          </nav>

          {notice && (
            <p
              role="status"
              style={notice.type === "ok" ? styles.noticeOk : styles.noticeError}
            >
              {notice.text}
            </p>
          )}

          {!data ? (
            <p style={styles.muted}>Loading data…</p>
          ) : (
            <section style={styles.panel}>
              {(tab === "engineers" || tab === "vendors") && (
                <NameList
                  key={tab}
                  noun={tab === "engineers" ? "engineer" : "vendor"}
                  list={data[tab]}
                  saving={saving}
                  onSave={(v, msg) => save(tab, v, msg)}
                />
              )}
              {tab === "stores" && (
                <StoreList list={data.stores} saving={saving} onSave={(v, msg) => save("stores", v, msg)} />
              )}
              {tab === "items" && (
                <ItemsEditor list={data.items} saving={saving} onSave={(v, msg) => save("items", v, msg)} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function countOf(data, key) {
  if (key === "items") return data.items.reduce((n, c) => n + c.items.length, 0);
  return data[key].length;
}

// ---------------- Login ----------------
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onLogin();
    } catch (e) {
      setError(e.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.loginBox}>
      <h1 style={{ ...styles.title, marginBottom: 4 }}>Admin login</h1>
      <p style={styles.muted}>Manage engineers, vendors, offices and items on the order form.</p>
      <label style={styles.label} htmlFor="admin-email">Email</label>
      <input
        id="admin-email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
        required
      />
      <label style={styles.label} htmlFor="admin-password">Password</label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
        required
      />
      {error && <p style={styles.noticeError}>{error}</p>}
      <button type="submit" disabled={busy} style={styles.primaryButton}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

// ---------------- Engineers / Vendors ----------------
function NameList({ noun, list, saving, onSave }) {
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null); // index
  const [editValue, setEditValue] = useState("");

  const exists = (name, skip = -1) =>
    list.some((v, i) => i !== skip && v.trim().toLowerCase() === name.trim().toLowerCase());

  const add = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (exists(name)) return alert(`"${name}" is already in the list.`);
    if (await onSave([...list, name], `Added ${noun} "${name}".`)) setNewName("");
  };

  const remove = (i) => {
    if (!confirm(`Remove ${noun} "${list[i]}" from the form?`)) return;
    onSave(list.filter((_, j) => j !== i), `Removed "${list[i]}".`);
  };

  const saveEdit = async (i) => {
    const name = editValue.trim();
    if (!name) return;
    if (exists(name, i)) return alert(`"${name}" is already in the list.`);
    if (await onSave(list.map((v, j) => (j === i ? name : v)), `Renamed to "${name}".`)) setEditing(null);
  };

  const shown = list
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <form onSubmit={add} style={styles.addRow}>
        <input
          placeholder={noun === "engineer" ? "New engineer, e.g. Raj Patel (123456)" : "New vendor, e.g. Chief (22106)"}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ ...styles.input, flex: 1, minWidth: 200 }}
          aria-label={`New ${noun} name`}
        />
        <button type="submit" disabled={saving || !newName.trim()} style={styles.primaryButton}>
          Add {noun}
        </button>
      </form>
      <p style={styles.hint}>Exactly what you type here appears in the form and in the order email.</p>

      <input
        placeholder={`Search ${list.length} ${noun}s`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ ...styles.input, marginBottom: 12 }}
        aria-label="Search"
      />

      <ul style={styles.list}>
        {shown.map(({ name, i }) => (
          <li key={`${name}-${i}`} style={styles.row}>
            {editing === i ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(i)}
                />
                <button onClick={() => saveEdit(i)} disabled={saving} style={styles.smallPrimary}>Save</button>
                <button onClick={() => setEditing(null)} style={styles.smallButton}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>
                  {name}
                  {exists(name, i) && <span style={styles.warnTag}>duplicate</span>}
                </span>
                <button
                  onClick={() => { setEditing(i); setEditValue(name); }}
                  style={styles.smallButton}
                >
                  Edit
                </button>
                <button onClick={() => remove(i)} disabled={saving} style={styles.smallDanger}>Remove</button>
              </>
            )}
          </li>
        ))}
        {shown.length === 0 && <li style={styles.muted}>No {noun}s match “{filter}”.</li>}
      </ul>
    </>
  );
}

// ---------------- Offices (stores) ----------------
function StoreList({ list, saving, onSave }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({ name: "", code: "" });

  const nameTaken = (n, skip = -1) =>
    list.some((s, i) => i !== skip && s.name.toLowerCase() === n.trim().toLowerCase());

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    if (nameTaken(name)) return alert(`"${name.trim()}" already exists.`);
    if (await onSave([...list, { name: name.trim(), code: code.trim() }], `Added office "${name.trim()}".`)) {
      setName("");
      setCode("");
    }
  };

  const remove = (i) => {
    if (!confirm(`Remove office "${list[i].name}" from the form?`)) return;
    onSave(list.filter((_, j) => j !== i), `Removed "${list[i].name}".`);
  };

  const saveEdit = async (i) => {
    if (!edit.name.trim() || !edit.code.trim()) return;
    if (nameTaken(edit.name, i)) return alert(`"${edit.name.trim()}" already exists.`);
    const next = list.map((s, j) => (j === i ? { name: edit.name.trim(), code: edit.code.trim() } : s));
    if (await onSave(next, "Office updated.")) setEditing(null);
  };

  return (
    <>
      <form onSubmit={add} style={styles.addRow}>
        <input
          placeholder="Office name, e.g. F-station"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...styles.input, flex: 2, minWidth: 160 }}
          aria-label="Office name"
        />
        <input
          placeholder="Sloc code, e.g. 0004"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ ...styles.input, flex: 1, minWidth: 120 }}
          aria-label="Sloc code"
        />
        <button type="submit" disabled={saving || !name.trim() || !code.trim()} style={styles.primaryButton}>
          Add office
        </button>
      </form>
      <p style={styles.hint}>The name shows in the form. The Sloc code goes into the email’s Store Location and Sloc column.</p>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Office</th>
              <th style={styles.th}>Sloc code</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={`${s.name}-${i}`}>
                {editing === i ? (
                  <>
                    <td style={styles.td}>
                      <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={styles.input} />
                    </td>
                    <td style={styles.td}>
                      <input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} style={styles.input} />
                    </td>
                    <td style={{ ...styles.td, ...styles.actions }}>
                      <button onClick={() => saveEdit(i)} disabled={saving} style={styles.smallPrimary}>Save</button>
                      <button onClick={() => setEditing(null)} style={styles.smallButton}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={styles.td}>{s.name}</td>
                    <td style={styles.td}>{s.code}</td>
                    <td style={{ ...styles.td, ...styles.actions }}>
                      <button onClick={() => { setEditing(i); setEdit(s); }} style={styles.smallButton}>Edit</button>
                      <button onClick={() => remove(i)} disabled={saving} style={styles.smallDanger}>Remove</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------- Items ----------------
function ItemsEditor({ list, saving, onSave }) {
  const [open, setOpen] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [search, setSearch] = useState("");

  const catTaken = (n, skip = -1) =>
    list.some((c, i) => i !== skip && c.category.toLowerCase() === n.trim().toLowerCase());

  const addCategory = async (e) => {
    e.preventDefault();
    const n = newCategory.trim();
    if (!n) return;
    if (catTaken(n)) return alert(`Category "${n}" already exists.`);
    if (await onSave([...list, { category: n, items: [] }], `Added category "${n}".`)) {
      setNewCategory("");
      setOpen(list.length);
    }
  };

  const removeCategory = (ci) => {
    const c = list[ci];
    if (!confirm(`Remove category "${c.category}" and its ${c.items.length} items from the form?`)) return;
    onSave(list.filter((_, j) => j !== ci), `Removed category "${c.category}".`);
    setOpen(null);
  };

  const saveRename = async (ci) => {
    const n = renameValue.trim();
    if (!n) return;
    if (catTaken(n, ci)) return alert(`Category "${n}" already exists.`);
    if (await onSave(list.map((c, j) => (j === ci ? { ...c, category: n } : c)), "Category renamed.")) setRenaming(null);
  };

  const updateItems = (ci, items, msg) =>
    onSave(list.map((c, j) => (j === ci ? { ...c, items } : c)), msg);

  const q = search.trim().toLowerCase();

  return (
    <>
      <form onSubmit={addCategory} style={styles.addRow}>
        <input
          placeholder="New category, e.g. cables"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ ...styles.input, flex: 1, minWidth: 200 }}
          aria-label="New category name"
        />
        <button type="submit" disabled={saving || !newCategory.trim()} style={styles.primaryButton}>
          Add category
        </button>
      </form>

      <input
        placeholder="Search items by ID or name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...styles.input, margin: "4px 0 12px" }}
        aria-label="Search items"
      />

      {list.map((c, ci) => {
        const matches = q
          ? c.items.filter((it) => it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))
          : c.items;
        if (q && matches.length === 0) return null;
        const isOpen = q ? true : open === ci;
        const header = ci % 2 === 0 ? styles.catHeaderEven : styles.catHeaderOdd;

        return (
          <div key={`${c.category}-${ci}`} style={styles.catBox}>
            <div style={{ ...styles.catHeader, ...header }}>
              {renaming === ci ? (
                <div style={{ display: "flex", gap: 8, flex: 1 }}>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveRename(ci)}
                  />
                  <button onClick={() => saveRename(ci)} disabled={saving} style={styles.smallPrimary}>Save</button>
                  <button onClick={() => setRenaming(null)} style={styles.smallButton}>Cancel</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setOpen(isOpen && !q ? null : ci)}
                    style={styles.catToggle}
                    aria-expanded={isOpen}
                  >
                    <span>{c.category}</span>
                    <span style={styles.catCount}>{c.items.length} items {isOpen ? "−" : "+"}</span>
                  </button>
                  <button onClick={() => { setRenaming(ci); setRenameValue(c.category); }} style={styles.headerButton}>
                    Rename
                  </button>
                  <button onClick={() => removeCategory(ci)} disabled={saving} style={styles.headerButton}>
                    Remove
                  </button>
                </>
              )}
            </div>
            {isOpen && (
              <CategoryItems
                items={c.items}
                visible={matches}
                saving={saving}
                onChange={(items, msg) => updateItems(ci, items, msg)}
              />
            )}
          </div>
        );
      })}
      {q && list.every((c) => !c.items.some((it) => it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) && (
        <p style={styles.muted}>No items match “{search}”.</p>
      )}
    </>
  );
}

function CategoryItems({ items, visible, saving, onChange }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({ id: "", name: "" });

  const idTaken = (v, skip = -1) => items.some((it, i) => i !== skip && it.id === v.trim());

  const add = async (e) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) return;
    if (idTaken(id)) return alert(`ID ${id.trim()} is already used in this category.`);
    if (await onChange([...items, { id: id.trim(), name: name.trim() }], `Added "${name.trim()}".`)) {
      setId("");
      setName("");
    }
  };

  const remove = (i) => {
    if (!confirm(`Remove "${items[i].name}" (${items[i].id}) from the form?`)) return;
    onChange(items.filter((_, j) => j !== i), `Removed "${items[i].name}".`);
  };

  const saveEdit = async (i) => {
    if (!edit.id.trim() || !edit.name.trim()) return;
    if (idTaken(edit.id, i)) return alert(`ID ${edit.id.trim()} is already used in this category.`);
    const next = items.map((it, j) => (j === i ? { id: edit.id.trim(), name: edit.name.trim() } : it));
    if (await onChange(next, "Item updated.")) setEditing(null);
  };

  return (
    <div style={styles.catBody}>
      <form onSubmit={add} style={styles.addRow}>
        <input
          placeholder="Component ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          style={{ ...styles.input, flex: 1, minWidth: 110 }}
          aria-label="Component ID"
        />
        <input
          placeholder="Description"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...styles.input, flex: 2, minWidth: 160 }}
          aria-label="Description"
        />
        <button type="submit" disabled={saving || !id.trim() || !name.trim()} style={styles.primaryButton}>
          Add item
        </button>
      </form>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Component ID</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((it) => {
              const i = items.indexOf(it);
              return (
                <tr key={`${it.id}-${i}`}>
                  {editing === i ? (
                    <>
                      <td style={styles.td}>
                        <input value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} style={styles.input} />
                      </td>
                      <td style={styles.td}>
                        <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={styles.input} />
                      </td>
                      <td style={{ ...styles.td, ...styles.actions }}>
                        <button onClick={() => saveEdit(i)} disabled={saving} style={styles.smallPrimary}>Save</button>
                        <button onClick={() => setEditing(null)} style={styles.smallButton}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={styles.td}>
                        {it.id}
                        {idTaken(it.id, i) && (
                          <span style={styles.warnTag} title="Another item in this category has the same ID. Quantities for the two will overwrite each other on the form.">
                            same ID
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{it.name}</td>
                      <td style={{ ...styles.td, ...styles.actions }}>
                        <button onClick={() => { setEditing(i); setEdit(it); }} style={styles.smallButton}>Edit</button>
                        <button onClick={() => remove(i)} disabled={saving} style={styles.smallDanger}>Remove</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={3} style={{ ...styles.td, ...styles.muted }}>No items yet. Add the first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- styles (matches the order form) ----------------
const css = `
  button:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid #e8ca04; outline-offset: 2px; }
  button:disabled { opacity: .55; cursor: not-allowed; }
`;

const blue = "#033f85";
const slate = "#373e5e";

const styles = {
  page: {
    padding: "2rem 1rem 4rem",
    maxWidth: "820px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f4f6f8",
    color: "#333",
    minHeight: "100vh",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: "1.25rem" },
  title: { fontSize: "1.6rem", margin: 0, color: "#222" },
  muted: { color: "#666", margin: "0.5rem 0" },
  hint: { color: "#666", fontSize: "0.85rem", margin: "6px 0 16px" },
  label: { fontWeight: 600, marginTop: 8 },
  input: {
    padding: "10px",
    fontSize: "0.95rem",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#f9f9f9",
    color: "#000",
    border: "2px solid #ccc",
    borderRadius: "8px",
  },
  loginBox: {
    backgroundColor: "#fff",
    padding: "1.75rem",
    borderRadius: "10px",
    boxShadow: "0 0 8px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxWidth: 380,
    margin: "3rem auto",
  },
  tabs: { display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `3px solid ${blue}` },
  tab: {
    padding: "10px 16px",
    fontSize: "0.95rem",
    border: "none",
    borderRadius: "8px 8px 0 0",
    backgroundColor: "#dfe4ea",
    color: "#333",
    cursor: "pointer",
    fontWeight: 600,
  },
  tabActive: { backgroundColor: blue, color: "#fff" },
  count: { marginLeft: 8, fontWeight: 400, opacity: 0.8, fontSize: "0.85rem" },
  panel: { backgroundColor: "#fff", padding: "1.25rem", borderRadius: "0 0 10px 10px", boxShadow: "0 0 8px rgba(0,0,0,0.05)" },
  addRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: "1px solid #eee" },
  primaryButton: {
    padding: "10px 18px",
    fontSize: "0.95rem",
    backgroundColor: "#e8ca04",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  secondaryButton: { padding: "8px 14px", fontSize: "0.9rem", backgroundColor: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" },
  linkButton: { padding: "8px 14px", fontSize: "0.9rem", backgroundColor: "#fff", color: blue, border: `1px solid ${blue}`, borderRadius: "6px", textDecoration: "none" },
  smallButton: { marginLeft: 6, padding: "5px 10px", fontSize: "0.85rem", backgroundColor: "#eef1f4", color: "#333", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer" },
  smallPrimary: { marginLeft: 6, padding: "5px 10px", fontSize: "0.85rem", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" },
  smallDanger: { marginLeft: 6, padding: "5px 10px", fontSize: "0.85rem", backgroundColor: "#fff", color: "#b42318", border: "1px solid #e4b4ae", borderRadius: "6px", cursor: "pointer" },
  warnTag: { marginLeft: 8, fontSize: "0.75rem", backgroundColor: "#fff4d6", color: "#7a5a00", border: "1px solid #e8ca04", borderRadius: 4, padding: "1px 6px" },
  noticeOk: { backgroundColor: "#e7f6ec", color: "#1e6b34", padding: "10px 12px", borderRadius: 8, margin: "12px 0" },
  noticeError: { backgroundColor: "#fdecea", color: "#8a1c1c", padding: "10px 12px", borderRadius: 8, margin: "12px 0" },
  tableWrap: { overflowX: "auto", marginTop: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" },
  th: { textAlign: "left", padding: "10px", backgroundColor: "#e9ecef", borderBottom: "1px solid #ccc" },
  td: { padding: "8px 10px", borderBottom: "1px solid #eee", verticalAlign: "middle" },
  actions: { whiteSpace: "nowrap", textAlign: "right" },
  catBox: { marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #e3e6ea" },
  catHeader: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", color: "#fff" },
  catHeaderEven: { backgroundColor: blue },
  catHeaderOdd: { backgroundColor: slate },
  catToggle: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "4px 2px",
    textAlign: "left",
  },
  catCount: { fontWeight: 400, fontSize: "0.85rem", opacity: 0.9 },
  headerButton: { padding: "4px 10px", fontSize: "0.8rem", backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer" },
  catBody: { padding: "12px", backgroundColor: "#fafbfc" },
};
