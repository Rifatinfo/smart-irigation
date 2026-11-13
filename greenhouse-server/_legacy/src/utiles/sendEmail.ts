import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";
import config from "../config";

const smtpPort = Number(config.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: smtpPort,
  // Port 465 uses implicit TLS; 587/25 use STARTTLS (secure: false)
  secure: smtpPort === 465,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
  tls: {
    minVersion: 'TLSv1.2',        // force modern TLS
    rejectUnauthorized: false,    // allow VPS self-signed certs
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

// verify() returns a promise — it must be handled, otherwise an SMTP
// failure becomes an unhandledRejection and shuts down the whole server.
transporter
  .verify()
  .then(() => console.log("✅ SMTP Server is ready"))
  .catch((error) => console.error("❌ SMTP connection failed:", error.message));

interface SendEmailOptions {
    to: string,
    subject: string,
    templateName: string,
    templateData?: Record<string, any>
    attachments?: {
        filename: string,
        content: Buffer | string,
        contentType: string
    }[]
}

export const sendEmail = async ({
    to,
    subject,
    templateName,
    templateData,
    attachments
}: SendEmailOptions) => {
    try {
        const templatePath = path.join(__dirname, `templates/${templateName}.ejs`)
        const html = await ejs.renderFile(templatePath, templateData);
        const info = await transporter.sendMail({
            from: config.SMTP_FROM,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments?.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType
            }))
        })
        console.log(`\u20709\uFE0F Email send to ${to} : ${info.messageId}`);

    } catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }

}