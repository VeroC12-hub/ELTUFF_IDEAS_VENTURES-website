import logoUrl from "@/assets/logo.png";

const COMPANY_KEY = "eltuff_company_settings";

interface CompanySettings {
  name: string; tagline: string; phone: string; address: string;
}
const defaultCo: CompanySettings = {
  name: "Eltuff Ideas Ventures",
  tagline: "Ani's Pride Hair & Skin Products",
  phone: "055 326 4442  |  055 534 4377",
  address: "Ayebeng Ave, Adenta, Accra — Ghana",
};
function loadCo(): CompanySettings {
  try { const r = localStorage.getItem(COMPANY_KEY); return r ? { ...defaultCo, ...JSON.parse(r) } : defaultCo; }
  catch { return defaultCo; }
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export interface PrintableReceipt {
  invoice_number: string;
  created_at: string;
  total_amount: number;
  billing_name?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  invoice_items?: Array<{ description: string; quantity: number; unit_price: number; total_price: number }> | null;
}

export async function printReceipt(receipt: PrintableReceipt): Promise<void> {
  const co = loadCo();
  const logoB64 = await toBase64(logoUrl);
  const items = receipt.invoice_items ?? [];
  const date = new Date(receipt.created_at).toLocaleString("en-GB");

  const rowsHtml = items.map(it => `
    <tr>
      <td class="l">${it.description}<br><span class="sub">${it.quantity} x ${it.unit_price.toFixed(2)}</span></td>
      <td class="r">${it.total_price.toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Receipt ${receipt.invoice_number}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:80mm auto;margin:0}
  body{font-family:"Courier New",monospace;width:80mm;padding:4mm;font-size:10pt}
  .center{text-align:center}
  .logo{height:14mm;width:auto;margin:0 auto 2mm}
  .co-name{font-weight:900;font-size:12pt;text-transform:uppercase}
  .co-sub{font-size:8pt;color:#333}
  .divider{border-top:1px dashed #000;margin:2mm 0}
  table{width:100%;border-collapse:collapse;font-size:9pt}
  td{padding:1mm 0;vertical-align:top}
  td.l{text-align:left}
  td.r{text-align:right;white-space:nowrap}
  .sub{font-size:8pt;color:#444}
  .total-row td{font-weight:900;font-size:11pt;padding-top:2mm}
  .meta{font-size:8.5pt;margin:1.5mm 0}
  .footer{font-size:8.5pt;margin-top:3mm}
</style>
</head>
<body>
  <div class="center">
    <img class="logo" src="${logoB64}" alt="Logo" />
    <div class="co-name">${co.name}</div>
    <div class="co-sub">${co.tagline}</div>
    <div class="co-sub">${co.address}</div>
    <div class="co-sub">${co.phone}</div>
  </div>
  <div class="divider"></div>
  <div class="meta">Receipt: ${receipt.invoice_number}</div>
  <div class="meta">Date: ${date}</div>
  <div class="meta">Customer: ${receipt.billing_name ?? "Walk-in Customer"}</div>
  <div class="divider"></div>
  <table>
    <tbody>${rowsHtml}</tbody>
    <tr class="total-row"><td class="l">TOTAL</td><td class="r">₵ ${receipt.total_amount.toFixed(2)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="meta">Paid by: ${(receipt.payment_method ?? "cash").toUpperCase()}</div>
  ${receipt.payment_reference ? `<div class="meta">Ref: ${receipt.payment_reference}</div>` : ""}
  <div class="footer center">Thank you for shopping with us!</div>
</body></html>`;

  // Print via a hidden iframe rather than opening a new tab/window, so the
  // shop's own page never navigates away or loses its place.
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) { cleanup(); return; }
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Fallback cleanup in case the browser never fires afterprint (some mobile browsers).
    setTimeout(cleanup, 60000);
  }, 300);
}
