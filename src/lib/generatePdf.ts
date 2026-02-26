import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PdfInvoiceData {
  invoice_number?: string;
  quote_number?: string;
  type: "invoice" | "quote";
  client_name: string;
  client_email?: string;
  client_phone?: string;
  issued_date: string;
  due_date?: string;
  valid_until?: string;
  items: PdfLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  company_name: string;
  company_phone: string;
  company_whatsapp: string;
  company_email: string;
  company_address: string;
}

export function generatePdfBlob(data: PdfInvoiceData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const docNumber = data.invoice_number ?? data.quote_number ?? "";
  const docLabel  = data.type === "invoice" ? "INVOICE" : "QUOTE";

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.company_name, 14, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(data.company_address, 14, 27);
  doc.text(`📞 ${data.company_phone}  |  📱 ${data.company_whatsapp}`, 14, 32);
  doc.text(`✉  ${data.company_email}`, 14, 37);

  // Doc type badge (top right)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 90, 200);
  doc.text(docLabel, 196, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`# ${docNumber}`, 196, 27, { align: "right" });
  doc.text(`Date: ${data.issued_date}`, 196, 33, { align: "right" });
  if (data.due_date)    doc.text(`Due: ${data.due_date}`, 196, 39, { align: "right" });
  if (data.valid_until) doc.text(`Valid until: ${data.valid_until}`, 196, 39, { align: "right" });

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(200);
  doc.setLineWidth(0.4);
  doc.line(14, 43, 196, 43);

  // ── Bill To ─────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("BILL TO", 14, 50);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  doc.setFontSize(11);
  doc.text(data.client_name, 14, 56);
  doc.setFontSize(9);
  doc.setTextColor(80);
  if (data.client_email) doc.text(data.client_email, 14, 61);
  if (data.client_phone) doc.text(data.client_phone, 14, 66);

  // ── Line Items Table ─────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 73,
    head: [["Description", "Qty", "Unit Price (₵)", "Total (₵)"]],
    body: data.items.map(i => [
      i.description,
      i.quantity,
      i.unit_price.toFixed(2),
      i.total_price.toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 90, 200], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  // ── Totals ──────────────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const rightX = 196;

  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Subtotal:", rightX - 50, finalY, { align: "right" });
  doc.text(`₵ ${data.subtotal.toFixed(2)}`, rightX, finalY, { align: "right" });

  if (data.tax_amount > 0) {
    doc.text("Tax:", rightX - 50, finalY + 6, { align: "right" });
    doc.text(`₵ ${data.tax_amount.toFixed(2)}`, rightX, finalY + 6, { align: "right" });
  }

  const totalY = finalY + (data.tax_amount > 0 ? 13 : 7);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("TOTAL:", rightX - 50, totalY, { align: "right" });
  doc.setTextColor(40, 90, 200);
  doc.text(`₵ ${data.total_amount.toFixed(2)}`, rightX, totalY, { align: "right" });

  // ── Notes ───────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text("Notes:", 14, totalY);
    doc.setTextColor(50);
    const noteLines = doc.splitTextToSize(data.notes, 120);
    doc.text(noteLines, 14, totalY + 6);
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("Thank you for your business!", 105, 285, { align: "center" });
  doc.text(data.company_name + " · " + data.company_email, 105, 289, { align: "center" });

  return doc.output("blob");
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Try Web Share API (works on mobile), fallback to download + open WhatsApp link */
export async function shareViaWhatsApp({
  pdfBlob,
  filename,
  waPhone,
  message,
}: {
  pdfBlob: Blob;
  filename: string;
  waPhone: string;
  message: string;
}) {
  const file = new File([pdfBlob], filename, { type: "application/pdf" });
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${message}`
    : `https://wa.me/?text=${message}`;

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: filename.replace(".pdf", ""),
        text: decodeURIComponent(message),
        files: [file],
      });
      return;
    } catch {
      // user cancelled or error — fall through to fallback
    }
  }
  // Fallback: download PDF and open WhatsApp in new tab
  downloadPdf(pdfBlob, filename);
  window.open(waUrl, "_blank");
}
