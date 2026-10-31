import nodemailer from "nodemailer";
import { getAllData } from "@/lib/data";
import { DEFAULT_STORES } from "@/lib/defaults";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { name, email, store, orderNo, formData, engineer, vender } = req.body;

  // Map dropdown values to store codes (managed on /admin)
  let stores = DEFAULT_STORES;
  try {
    stores = (await getAllData()).stores;
  } catch (err) {
    console.error("Store lookup failed, using defaults:", err);
  }
  const storeMap = Object.fromEntries(stores.map((s) => [s.name, s.code]));

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Prepare the Recipient Name in UPPERCASE
  const recipientUpper = name ? name.toUpperCase() : "";

  // Create table rows
  const itemTable = Object.entries(formData)
    .map(([category, items]) => {
      const itemEntries = Object.values(items)
        .filter((item) => item.quantity && item.quantity !== 0);

      if (itemEntries.length === 0) return '';

      return itemEntries.map((item) => `
          <tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td align="center">${item.quantity}</td>
            <td></td>
            <td></td>
            <td align="center">${storeMap[store] || ""}</td>
            <td align="center">TD02</td>
            <td align="center">0010</td>
            <td></td>
            <td></td>
            <td>${recipientUpper}</td>
          </tr>
        `).join('');
    })
    .join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Recipient ${name} & Engineer ${engineer} Order Confirmation`,
    html: `
      <p><strong>Recipient Name:</strong> ${name}</p>
      <p><strong>Store Location:</strong> ${storeMap[store] || store}</p>
      <p><strong>Engineer:</strong> ${engineer}</p>
      <p><strong>Vender:</strong> ${vender}</p>
      ${orderNo ? `<p><strong>Order Number:</strong> ${orderNo}</p>` : ""}

      <h3>Order Details</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
        <thead>
          <tr style="background-color: #e9c46a;">
            <th>Component</th>
            <th>Description</th>
            <th>Reqmnt Qnt</th>
            <th>UM</th>
            <th>LC</th>
            <th>Sloc</th>
            <th>Plnt</th>
            <th>Act.</th>
            <th>Batch</th>
            <th>Proc. Category</th>
            <th>Recipient</th>
          </tr>
        </thead>
        <tbody>
          ${itemTable}
        </tbody>
      </table>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email sent!");
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).send("Error sending email.");
  }
}
