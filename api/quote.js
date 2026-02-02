import formidable from "formidable";
import nodemailer from "nodemailer";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILES = 4;
const MAX_MB_EACH = 8; // wysoka jakość, ale jeszcze bezpieczna

function parseForm(req) {
  const form = formidable({
    multiples: true,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_MB_EACH * 1024 * 1024,
    keepExtensions: true,
    filter: ({ mimetype }) => {
      return !!mimetype && mimetype.startsWith("image/");
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { fields, files } = await parseForm(req);

    let photos = files.photos || [];
    if (!Array.isArray(photos)) photos = [photos];
    if (photos.length > MAX_FILES) {
      return res.status(400).json({ error: `Max ${MAX_FILES} photos allowed.` });
    }

    // === POLA ===
    const name = String(fields.name || "").trim();
    const phone = String(fields.phone || "").trim();
    const email = String(fields.email || "").trim();
    const postcode = String(fields.postcode || "").trim();
    const service = String(fields.service || "").trim();
    const message = String(fields.message || "").trim();

    if (!name || !phone || !email || !postcode || !service || !message) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // === ENV CLEAN (KRYTYCZNE) ===
    const SMTP_HOST = String(process.env.SMTP_HOST || "")
      .trim()
      .replace(/^"+|"+$/g, "");

    const SMTP_USER = String(process.env.SMTP_USER || "").trim();
    const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
    const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
    const TO_EMAIL = String(process.env.TO_EMAIL || SMTP_USER).trim();

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("SMTP ENV MISSING");
      return res.status(500).json({ error: "Email configuration error." });
    }

    // === TRANSPORT ===
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // === ZAŁĄCZNIKI ===
    const attachments = photos.map((file, i) => ({
      filename: file.originalFilename || `photo-${i + 1}.jpg`,
      path: file.filepath,
      contentType: file.mimetype || "image/jpeg",
    }));

    // === TREŚĆ ===
    const text = `
NEW COMBI → COMBI SWAP ENQUIRY

Name: ${name}
Phone: ${phone}
Email: ${email}
Postcode: ${postcode}

Selected option:
${service}

Message:
${message}
    `.trim();

    await transporter.sendMail({
      from: `"Mateusz Dudzik Website" <${SMTP_USER}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Boiler Swap Enquiry — ${postcode} — ${name}`,
      text,
      attachments,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "Upload failed. Please try again.",
    });
  }
}

