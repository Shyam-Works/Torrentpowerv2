import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const [formData, setFormData] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [store, setStore] = useState("");
  const [engineer, setEngineer] = useState("");
  const [vender, setVender] = useState("");
  const [orderNo, setOrderNo] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);

  // Engineers, vendors, offices and items are managed on /admin
  const [options, setOptions] = useState({
    engineers: [],
    vendors: [],
    stores: [],
    items: {},
  });
  const [optionsStatus, setOptionsStatus] = useState("loading");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOptions(data);
        setOptionsStatus("ready");
        // Clear a saved choice that an admin has since removed
        setStore((v) => (v && !data.stores.includes(v) ? "" : v));
        setEngineer((v) => (v && !data.engineers.includes(v) ? "" : v));
        setVender((v) => (v && !data.vendors.includes(v) ? "" : v));
      })
      .catch(() => setOptionsStatus("error"));
  }, []);

  useEffect(() => {
  const savedData = localStorage.getItem("orderData");
  if (savedData) {
    const parsed = JSON.parse(savedData);
    if (parsed.name) setName(parsed.name);
    if (parsed.email) setEmail(parsed.email);
    if (parsed.store) setStore(parsed.store);
    if (parsed.engineer) setEngineer(parsed.engineer);
    if (parsed.vender) setVender(parsed.vender);
    if (parsed.orderNo) setOrderNo(parsed.orderNo);
    if (parsed.formData) setFormData(parsed.formData);
  }
}, []);


  const handleInputChange = (category, item, quantity, id) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [id]: {
          id,
          name: item,
          quantity: parseFloat(quantity) || 0,
        },
      },
    }));
  };
  const router = useRouter();
  const handleSubmit = () => {
    console.log(name, store, email, engineer, vender);
    if (
      !name.trim() ||
      !store.trim() ||
      !email.trim() ||
      !engineer.trim() ||
      !vender.trim()
    ) {
      alert("Please enter all required fields.");
      return;
    }

    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      alert("Only Gmail addresses (@gmail.com) are allowed.");
      return;
    }

    // Save data to localStorage (or a global store like Zustand or Context API)
    const data = {
      name,
      email,
      store,
      orderNo,
      formData,
      engineer,
      vender,
    };
    localStorage.setItem("orderData", JSON.stringify(data));

    router.push("/review"); // Navigate to the review page
  };

  if (submitted) {
    return (
      <h2 style={{ textAlign: "center", padding: "2rem" }}>
        Thanks, {name}! Your request was sent.
      </h2>
    );
  }

  return (
    <div style={styles.container}>
      <Head>
        <link rel="icon" href="/Screenshot 2025-08-06 225455.png" />
        <title>Contractor Order Form</title>
      </Head>
      <h1 style={styles.heading}>
        <b>Contractor Order Form</b>
      </h1>
      <h2 style={styles.sectionTitle}>User Info</h2>
      {optionsStatus === "error" && (
        <p style={styles.loadError}>
          Could not load engineers, vendors and items. Refresh the page; if it keeps failing, contact the admin.
        </p>
      )}

      <div style={styles.inputContainer}>
        <label style={styles.xyz}>Recipient Name*</label>
        <input
          type="text"
          placeholder="Recipient Name"
          value={name}
          style={styles.fullInput}
          onChange={(e) => setName(e.target.value)}
        />
        <label style={styles.xyz}>Recipient Email* (yourEmail@gmail.com)</label>
        <input
          type="email"
          placeholder="Recipient Name"
          value={email}
          style={styles.fullInput}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label style={styles.xyz}>Store Location*</label>
        <select
          value={store}
          onChange={(e) => setStore(e.target.value)}
          style={styles.fullInput}
        >
          <option value="">{optionsStatus === "loading" ? "Loading…" : "Select Store"}</option>
          {options.stores.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        <label style={styles.xyz}>Engineer*</label>

<select
  id="engineer-list"
  value={engineer}
  onChange={(e) => setEngineer(e.target.value)}
  style={styles.fullInput}
>
  <option value="">{optionsStatus === "loading" ? "Loading…" : "Select An Engineer"}</option>
  {options.engineers.map((en, i) => (
    <option key={`${en}-${i}`} value={en}>{en}</option>
  ))}
</select>

        <label style={styles.xyz}>Vender*</label>
        <select
          value={vender}
          onChange={(e) => setVender(e.target.value)}
          style={styles.fullInput}
        >
          <option value="">{optionsStatus === "loading" ? "Loading…" : "Select A Vendor"}</option>
          {options.vendors.map((v, i) => (
            <option key={`${v}-${i}`} value={v}>{v}</option>
          ))}
        </select>

        <label style={styles.xyz}>Order Number</label>
        <input
          type="text"
          placeholder="Optional Order Number"
          value={orderNo}
          style={styles.fullInput}
          onChange={(e) => setOrderNo(e.target.value)}
        />

      </div>
      <h2 style={styles.sectionTitle}>Order Info</h2>

      {Object.entries(options.items).map(([category, itemList], index) => {
        // Determine which header style to use based on the category's index
        const headerStyle = index % 2 === 0 
          ? { ...styles.categoryHeader, ...styles.categoryHeaderEven }
          : { ...styles.categoryHeader, ...styles.categoryHeaderOdd };

        return (
          <div key={category} style={styles.categoryBox}>
            <div
              style={headerStyle} // Apply the calculated style here
              onClick={() =>
                setOpenCategory(openCategory === category ? null : category)
              }
            >
              <h2 style={styles.categoryTitle}>{category}</h2>
              <span style={styles.toggleIcon}>
                {openCategory === category ? "−" : "+"}
              </span>
            </div>

            {openCategory === category && (
              <div style={styles.itemList}>
                {itemList.map((item, itemIndex) => (
                  <div
                    key={item.id || item.name}
                    // Removed the itemIndex % 2 logic, now uses only base itemRow style
                    style={styles.itemRow} 
                  >
                    <label style={styles.itemLabel}>{item.name}</label>
                    <label style={styles.itemLabel}>{item.id}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      style={styles.inputField}
                      value={
                        formData[category]?.[item.id]?.quantity !== undefined
                          ? formData[category][item.id].quantity
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          category,
                          item.name,
                          e.target.value,
                          item.id
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={styles.submitWrapper}>
        <button onClick={handleSubmit} style={styles.submitButton}>
          Review Order
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem 1rem",
    maxWidth: "700px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f4f6f8",
    color: "#333",
  },
  heading: {
    textAlign: "center",
    marginBottom: "2rem",
    fontSize: "2rem",
    color: "#222",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginTop: "1.5rem",
    marginBottom: "0.5rem",
    color: "#333",
  },
  inputContainer: {
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "10px",
    boxShadow: "0 0 8px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  fullInput: {
    padding: "12px",
    fontSize: "1rem",
    width: "100%",
    backgroundColor: "#f9f9f9",
    color: "#000",
    border: "2px solid #ccc",
    borderRadius: "8px",
    transition: "border 0.2s ease",
  },
  xyz: {
    fontWeight: "600",
    marginBottom: "4px",
  },
  categoryBox: {
    marginTop: "1.5rem",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#fff",
    boxShadow: "0 0 10px rgba(0,0,0,0.05)",
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.2s ease",
  },
  // UPDATED CATEGORY HEADER STYLES
  categoryHeaderEven: {
    backgroundColor: "#033f85", // Darker Blue
  },
  categoryHeaderOdd: {
    backgroundColor: "#373e5eff", // Lighter Blue
  },
  categoryTitle: {
    margin: 0,
    fontSize: "1rem",
  },
  toggleIcon: {
    fontSize: "1.5rem",
  },
  itemList: {
    padding: "1rem",
    maxHeight: "300px",
    overflowY: "auto",
    // Set a single background color for the entire item list area
    backgroundColor: "#e2e2e2ff", 
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
    alignItems: "center",
    fontSize: "0.95rem",
    padding: "8px",
    borderRadius: "4px",
    // Set a single background color for all item rows
    backgroundColor: "#e2e2e2ff", 
  },
  // REMOVED itemRowEven and itemRowOdd styles
  itemLabel: {
    flex: 2,
  },
  inputField: {
    width: "60px",
    padding: "6px",
    fontSize: "0.9rem",
    borderRadius: "6px",
    backgroundColor: "#f0f0f0",
    border: "1px solid #ccc",
  },
  loadError: {
    backgroundColor: "#fdecea",
    color: "#8a1c1c",
    padding: "10px 12px",
    borderRadius: "8px",
    margin: "0 0 1rem",
  },
  submitWrapper: {
    textAlign: "center",
    marginTop: "2rem",
  },
  submitButton: {
    padding: "12px 20px",
    fontSize: "1rem",
    backgroundColor: "#e8ca04ff",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 112, 243, 0.2)",
    transition: "background 0.3s ease",
  },
};
