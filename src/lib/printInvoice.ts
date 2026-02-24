import logoUrl from "@/assets/logo.png";

const COMPANY_KEY = "eltuff_company_settings";

interface CompanySettings {
  name: string; tagline: string; email: string;
  phone: string; address: string; website: string; logo_url: string;
}
const defaultCo: CompanySettings = {
  name: "Eltuff Ideas Ventures",
  tagline: "Ani's Pride Hair & Skin Products",
  email: "anisprideglobal@gmail.com",
  phone: "055 326 4442  |  055 534 4377",
  address: "Ayebeng Ave, Adenta, Accra — Ghana",
  website: "", logo_url: "",
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

export interface PrintableInvoice {
  invoice_number: string;
  created_at: string;
  due_date?: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  profiles?: { full_name?: string | null; email?: string | null; phone?: string | null; company_name?: string | null } | null;
  invoice_items?: Array<{ description: string; quantity: number; unit_price: number; total_price: number }> | null;
}

export async function printInvoice(invoice: PrintableInvoice): Promise<void> {
  const co = loadCo();
  const logoB64 = await toBase64(logoUrl);
  const invNum = invoice.invoice_number;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ELTUFF-INV-${invNum}`;
  const issueDate = new Date(invoice.created_at).toLocaleDateString("en-GB");
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-GB") : "—";
  const client = invoice.profiles;
  const items = invoice.invoice_items ?? [];

  const MIN_ROWS = 12;
  let rowsHtml = items.map(it => `
    <tr>
      <td class="c">${Number.isInteger(it.quantity) ? it.quantity : it.quantity.toFixed(2)}</td>
      <td class="dl">${it.description}</td>
      <td class="r">${it.unit_price.toFixed(2)}</td>
      <td class="r">${it.total_price.toFixed(2)}</td>
    </tr>`).join("");
  for (let i = items.length; i < MIN_ROWS; i++)
    rowsHtml += `<tr><td class="c">&nbsp;</td><td class="dl">&nbsp;</td><td class="r">&nbsp;</td><td class="r">&nbsp;</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Invoice ${invNum}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 portrait;margin:0}
  body{font-family:Arial,Helvetica,sans-serif;background:white}
  .page{width:210mm;min-height:297mm;padding:10mm 13mm 8mm;display:flex;flex-direction:column}
  /* header */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1a1a1a;padding-bottom:3mm;margin-bottom:3mm}
  .logo{height:17mm;width:auto}
  .co-name{font-size:14pt;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-top:1mm}
  .co-tag{font-size:8pt;color:#555;font-style:italic}
  .co-contact{font-size:7.5pt;color:#333;line-height:1.8;margin-top:1.5mm}
  .hdr-right{display:flex;flex-direction:column;align-items:center;gap:2mm}
  .qr-img{width:30mm;height:30mm;border:1.5px solid #333}
  .inv-box{border:2px solid #1a5fbf;padding:2mm 5mm;text-align:center;font-size:14pt;font-weight:900;letter-spacing:2px;font-family:monospace;min-width:34mm}
  /* title */
  .inv-title{font-size:24pt;font-weight:900;text-transform:uppercase;letter-spacing:3px;border-bottom:1.5px solid #999;padding-bottom:1.5mm;margin-bottom:3mm}
  /* customer/date */
  .cust-date{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:3mm}
  .cust-box{border:1px solid #666;padding:2.5mm 3mm}
  .sec-lbl{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#444;border-bottom:0.7px solid #aaa;margin-bottom:1.5mm;padding-bottom:0.5mm}
  .fl{display:flex;align-items:baseline;gap:2mm;margin-bottom:1.8mm}
  .fl label{font-size:7.5pt;font-weight:700;white-space:nowrap;min-width:17mm}
  .fl span{flex:1;border-bottom:0.7px solid #555;font-size:8pt;padding:0 1mm;min-height:4mm}
  .date-box{padding:2.5mm 3mm}
  .date-box .fl label{min-width:23mm}
  /* table */
  table.items{width:100%;border-collapse:collapse;font-size:8pt}
  table.items colgroup col.cq{width:14mm}
  table.items colgroup col.cp{width:28mm}
  table.items colgroup col.ct{width:28mm}
  table.items thead th{background:#1a1a1a;color:white;padding:2mm 2.5mm;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border:0.7px solid #333}
  table.items thead th.c{text-align:center}
  table.items tbody td{border:0.7px solid #c0c0c0;padding:1.8mm 2.5mm;height:7mm}
  table.items tbody td.c{text-align:center}
  table.items tbody td.r{text-align:right}
  table.items tbody td.dl{text-align:left}
  table.items tbody tr:nth-child(even){background:#f5faf5}
  /* product strip */
  .prod-strip{display:flex;align-items:center;gap:2.5mm;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:1.5mm 0;margin-top:2mm}
  .prod-strip img{height:11mm;width:auto;object-fit:cover;border-radius:2px;border:0.5px solid #ddd}
  .total-blk{margin-left:auto;display:flex;align-items:center;gap:3mm}
  .tot-lbl{font-size:10.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px}
  .tot-val{border-bottom:1.5px solid #1a1a1a;min-width:32mm;font-size:11pt;font-weight:700;text-align:right;padding:0 1mm;font-family:monospace}
  /* notes */
  .notes-row{font-size:7.5pt;color:#444;margin:2mm 0;min-height:5mm;padding:1.5mm 2mm;border:0.5px solid #ddd;border-radius:2px}
  /* sigs */
  .sigs{display:flex;justify-content:space-between;align-items:flex-end;margin-top:5mm;padding-top:2mm;border-top:0.7px solid #bbb}
  .sig-blk{display:flex;flex-direction:column;align-items:center;gap:1.5mm}
  .sig-line{width:46mm;border-bottom:1px solid #444}
  .sig-lbl{font-size:7.5pt;color:#444}
  .brand-sig{font-size:13pt;font-weight:900;font-style:italic;color:#2d7d4f}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div>
      <img class="logo" src="${logoB64}" alt="Logo" />
      <div class="co-name">${co.name}</div>
      <div class="co-tag">${co.tagline}</div>
      <div class="co-contact">
        A: ${co.address}<br>
        E: ${co.email}<br>
        T: ${co.phone}
      </div>
    </div>
    <div class="hdr-right">
      <img class="qr-img" id="qr" src="${qrUrl}" alt="QR" />
      <div class="inv-box">${invNum}</div>
    </div>
  </div>

  <div class="inv-title">Invoice</div>

  <div class="cust-date">
    <div class="cust-box">
      <div class="sec-lbl">&mdash; Customer &mdash;</div>
      <div class="fl"><label>NAME:</label><span>${client?.full_name ?? ""}</span></div>
      <div class="fl"><label>ADDRESS:</label><span>${client?.company_name ?? ""}</span></div>
      <div class="fl"><label>PHONE/EMAIL:</label><span>${client?.phone ?? client?.email ?? ""}</span></div>
    </div>
    <div class="date-box">
      <div class="fl" style="margin-top:8mm"><label>DATE:</label><span>${issueDate}</span></div>
      <div class="fl" style="margin-top:3mm"><label>DUE DATE:</label><span>${dueDate}</span></div>
    </div>
  </div>

  <table class="items">
    <colgroup><col class="cq"/><col/><col class="cp"/><col class="ct"/></colgroup>
    <thead>
      <tr>
        <th class="c">QTY.</th>
        <th>DESCRIPTION</th>
        <th class="c">UNIT PRICE (GHS)</th>
        <th class="c">TOTAL (GHS)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="prod-strip">
    <div class="total-blk" style="margin-left:0;flex-direction:column;align-items:flex-end;gap:1mm;width:100%">
      ${invoice.tax_amount > 0 ? `<div style="display:flex;justify-content:flex-end;gap:3mm;font-size:8.5pt;color:#555"><span>Subtotal:</span><span style="min-width:32mm;text-align:right;font-family:monospace">${invoice.amount.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:flex-end;gap:3mm;font-size:8.5pt;color:#555"><span>Tax:</span><span style="min-width:32mm;text-align:right;font-family:monospace">${invoice.tax_amount.toFixed(2)}</span></div>` : ""}
      <div style="display:flex;justify-content:flex-end;gap:3mm;align-items:center">
        <span class="tot-lbl">Total GHS</span>
        <span class="tot-val">${invoice.total_amount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes-row"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}

  <div class="sigs">
    <div class="sig-blk"><div class="sig-line"></div><div class="sig-lbl">Customer&rsquo;s Signature</div></div>
    <div class="sig-blk"><div class="sig-line"></div><div class="sig-lbl">Manager&rsquo;s Signature</div></div>
    <div class="brand-sig">Ani&rsquo;s Pride</div>
  </div>
</div>
<script>
  var qr=document.getElementById('qr');
  function doPrint(){setTimeout(function(){window.print();},300);}
  if(qr.complete){doPrint();}else{qr.onload=doPrint;qr.onerror=doPrint;setTimeout(doPrint,2500);}
</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}
