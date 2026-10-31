import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Review() {
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem("orderData");
    if (storedData) {
      setData(JSON.parse(storedData));
    } else {
      router.push("/"); // Redirect if no data
    }
  }, []);

  const handleConfirm = async () => {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      alert("Order sent!");
      localStorage.removeItem("orderData");
      router.push("/");
    } else {
      alert("Failed to send email.");
    }
  };

  if (!data) return <p style={styles.loading}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Review Your Order</h2>

      <div style={styles.section}>
        <p><strong>Name:</strong> {data.name}</p>
        <p><strong>Email:</strong> {data.email}</p>
        <p><strong>Store:</strong> {data.store}</p>
        <p><strong>Engineer:</strong> {data.engineer}</p>
        <p><strong>Vendor:</strong> {data.vender}</p>
        {data.orderNo && <p><strong>Order No:</strong> {data.orderNo}</p>}
      </div>

      <h3 style={styles.subheading}>Items</h3>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.formData).flatMap(([cat, items]) =>
            Object.values(items)
              .filter((item) => item.quantity > 0)
              .map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.id}</td>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.quantity}</td>
                </tr>
              ))
          )}
        </tbody>
      </table>

      <div style={styles.buttonRow}>
        <button onClick={() => router.back()} style={styles.backButton}>Go Back</button>
        <button onClick={handleConfirm} style={styles.confirmButton}>Confirm & Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#f7f9fb",
    color: "#000",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "800px",
    margin: "auto",
    boxShadow: "0 0 12px rgba(0,0,0,0.05)",
    borderRadius: "10px",
  },
  heading: {
    fontSize: "1.8rem",
    marginBottom: "1rem",
    textAlign: "center",
  },
  subheading: {
    fontSize: "1.4rem",
    marginTop: "2rem",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  section: {
    marginBottom: "1.5rem",
    lineHeight: "1.6",
    fontSize: "1rem",
  },
  table: {
    width: "100%",
    margin: "0 auto",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    color: "#000",
    textAlign: "center",
    borderRadius: "6px",
    overflow: "hidden",
  },
  th: {
    padding: "12px",
    backgroundColor: "#e9ecef",
    borderBottom: "1px solid #ccc",
    fontWeight: "bold",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #eee",
  },
  buttonRow: {
    marginTop: "30px",
    display: "flex",
    justifyContent: "center",
    gap: "15px",
  },
  backButton: {
    padding: "10px 20px",
    fontSize: "1rem",
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  confirmButton: {
    padding: "10px 20px",
    fontSize: "1rem",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  loading: {
    textAlign: "center",
    marginTop: "4rem",
    fontSize: "1.2rem",
  },
};
