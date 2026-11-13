import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

export type OrderWithItems = {
  id: string;
  name: string;
  phone: string;
  address: string;
  state: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryCharge: number;
  deliveryType: string;
  subtotal: number;
  totalAmount: number;
  createdAt: Date;
  items: {
    productName: string;
    price: number;
    quantity: number;
    total: number;
    color?: string | null;
    size?: string | null;
    sku? : string | null;
  }[];
};

/**
 * Generates an invoice PDF and returns it as a Buffer
 * without using get-stream
 */
export const generateInvoice = async (order: OrderWithItems): Promise<Buffer> => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk) => chunks.push(chunk));

  const endPromise = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

  doc.pipe(stream);

  /* =========================
      HEADER (Company + Invoice)
  ========================== */
  const logoPath = path.join(process.cwd(), "src/assets/logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 110 });
  }

  doc
    .fontSize(14)
    .text("Colourrose", 40, 160)
    .fontSize(9)
    .text("89/1 Holan, Dakshinkhan, Dhaka");

  doc
    .fontSize(20)
    .text("INVOICE", 400, 40, { align: "right" })
    .fontSize(9)
    .text(`Invoice Date: ${order.createdAt.toDateString()}`, { align: "right" })
    .text(`Order Number: ${order.id}`, { align: "right" });

  doc.moveDown(2);

  /* =========================
      BILLING INFO
  ========================== */
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Bill To")
    .font("Helvetica")
    .moveDown(0.3)
    .text(order.name)
    .text(order.address)
    .text(order.state)
    .text(order.phone);

  doc.moveDown(2);

  /* =========================
      TABLE HEADER
  ========================== */
  const tableTop = doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Product", 40, tableTop)
    .text("Qty", 300, tableTop)
    .text("Price", 360, tableTop)
    .text("Total", 460, tableTop);

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  doc.font("Helvetica");

  /* =========================
      TABLE ROWS
  ========================== */
  let y = tableTop + 25;

  order.items.forEach((item) => {
    const variant = [
      item.color ? `Color: ${item.color}` : "",
      item.size ? `Size: ${item.size}` : "",
      item.sku ? `SKU: ${item.sku}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    doc
      .fontSize(9)
      .text(
        `${item.productName}${variant ? `\n${variant}` : ""}`,
        40,
        y,
        { width: 240 }
      )
      .text(item.quantity.toString(), 300, y)
      .text(`${item.price.toFixed(2)} TK`, 360, y)
      .text(`${item.total.toFixed(2)} TK`, 460, y);

    y += variant ? 35 : 25;
  });

  /* =========================
      TOTALS
  ========================== */
  doc
    .fontSize(10)
    .text("Subtotal", 360, y)
    .text(`${order.subtotal.toFixed(2)} TK`, 460, y);

  y += 15;

  doc
    .fontSize(10)
    .text(`${order.deliveryType}`, 360, y)
    .text(`${order.deliveryCharge.toFixed(2)} TK`, 460, y);

  y += 15;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Total", 360, y)
    .text(`${order.totalAmount.toFixed(2)} TK`, 460, y)
    .font("Helvetica");


  /* =========================
      PAYMENT INFO (BOX STYLE)
  ========================== */
  y += 40;

  doc
    .rect(40, y, 510, 60)
    .stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Payment Information", 50, y + 8);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Payment Method: ${order.paymentMethod}`, 50, y + 28)
    .text(`Payment Status: ${order.paymentStatus}`, 300, y + 28);

  /* =========================
      FOOTER
  ========================== */
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "This is a system generated invoice. No signature required.",
      40,
      770,
      { align: "center" }
    );

  doc.end();
  return endPromise;
};
