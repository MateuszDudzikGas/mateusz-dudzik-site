import formidable from "formidable";
import nodemailer from "nodemailer";

export const config = { api: { bodyParser: false } };

const MAX_FILES = 4;
const MAX_MB_EACH = 5;

function parseForm(req) {
  const form = formidable({
    multiples: true,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_MB_EACH * 1024 * 1024,
    filter: ({ mimetype }) => !!mimetype && mimetype.startsWith("image/"),
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// helper – bierze pierwszy element z array albo string
const v = (x) => (Array.isArray(x) ? x[0] : x || "");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("OK");
    }

    const { fields, files } = await parseForm(req);

    let photos = files.photos || [];
    if (!Array.isArray(photos)) photos = [photos];

    if (photos.length > MAX_FILES) {
      return res.status(400).json({ error: `Max ${MAX_FILES} photos.` });
    }

    const name = v(fields.name);
    const phone = v(fields.phone);
    const email = v(fields.email);
    const postcode = v(fields.postcode);
    const service = v(fields.service);
    const message = v(fields.message);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const attachments = photos.map((f, i) => ({
      filename: f.originalFilename || `photo-${i + 1}.jpg`,
      path: f.filepath,
      contentType: f.mimetype || "image/jpeg",
    }));

    const text = `NEW COMBI SWAP ENQUIRY

Name: ${name}
Phone: ${phone}
Email: ${email}
Postcode: ${postcode}

Selected option:
${service}

Message:
${message}
`;

    await transporter.sendMail({
      from: `"Website Enquiries" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USER,
      replyTo: email || undefined,
      subject: `Boiler Swap Enquiry — ${postcode} — ${name}`,
      text,
      attachments,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: err.message || "Upload failed",
    });
  }
}
