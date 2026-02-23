import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── CSV ────────────────────────────────────────────────────────────────────────
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename + ".csv");
}

// ── XLSX ───────────────────────────────────────────────────────────────────────
export interface XLSXSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export function exportXLSX(filename: string, sheets: XLSXSheet[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, headers, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Bold header row
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true } };
    }
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename + ".xlsx");
}

// ── PDF ────────────────────────────────────────────────────────────────────────
export interface PDFSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
}

export function exportPDF(filename: string, title: string, sections: PDFSection[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageW / 2, 40, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 56, { align: "center" });

  let y = 72;

  sections.forEach(({ heading, columns, rows }) => {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(heading, 40, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows.map(r => r.map(c => String(c ?? ""))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => { y = data.cursor?.y ?? y; },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  });

  doc.save(filename + ".pdf");
}

// ── helpers ────────────────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
