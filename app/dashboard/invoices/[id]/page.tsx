import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

const prisma = new PrismaClient();

// Fungsi sederhana untuk mengubah angka ke huruf (Terbilang)
function terbilang(angka: number): string {
  const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let hasil = "";
  if (angka < 12) hasil = huruf[angka];
  else if (angka < 20) hasil = terbilang(angka - 10) + " belas";
  else if (angka < 100) hasil = terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
  else if (angka < 200) hasil = "seratus " + terbilang(angka - 100);
  else if (angka < 1000) hasil = terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
  else if (angka < 2000) hasil = "seribu " + terbilang(angka - 1000);
  else if (angka < 1000000) hasil = terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
  else if (angka < 1000000000) hasil = terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
  return hasil.trim();
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: id },
    include: { 
      subscriber: {
        include: { product: true }
      } 
    }
  });

  if (!invoice) return notFound();

  const sub = invoice.subscriber;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Format dates
  const formatTgl = (d: Date | string | number) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const tagihanBulan = monthNames[invoice.createdAt.getMonth()] + " " + invoice.createdAt.getFullYear();
  const terbilangText = terbilang(invoice.totalAmount) + " rupiah";

  return (
    <div style={{ background: "#e0e0e0", minHeight: "100vh", padding: "2rem", color: "black" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; margin: 0; padding: 0; }
          .invoice-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
        }
        .invoice-container {
          background: white;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
        }
        .inv-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .inv-section-title { font-weight: bold; margin-bottom: 5px; }
        .inv-table-box { border: 2px solid black; margin-bottom: 20px; }
        .inv-table-box table { width: 100%; border-collapse: collapse; }
        .inv-table-box th, .inv-table-box td { padding: 6px 10px; }
        .inv-table-box th { border-bottom: 1px solid black; text-align: left; }
        .inv-flex { display: flex; justify-content: space-between; gap: 20px; }
        .inv-border-box { border: 2px solid black; padding: 10px; width: 100%; }
      `}} />

      <div className="no-print" style={{ textAlign: "center", marginBottom: "1rem" }}>
        <PrintButton label="Cetak Invoice" />
        <a href="/dashboard/invoices" className="btn-secondary" style={{ marginLeft: "1rem", padding: "0.5rem 1.5rem", textDecoration: "none" }}>Kembali</a>
      </div>

      <div className="invoice-container">
        {/* Logo Placeholder */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ width: "200px", height: "50px", border: "2px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontWeight: "bold", fontSize: "16px" }}>
            [LOGO PERUSAHAAN]
          </div>
        </div>

        {/* Company Header */}
        <div className="inv-header">
          <div style={{ width: "50%" }}>
            <div className="inv-section-title" style={{fontSize: "14px"}}>PT. NAMA PERUSAHAAN ANDA</div>
            <div>ALAMAT PERUSAHAAN BARIS 1<br/>ALAMAT PERUSAHAAN BARIS 2<br/>KOTA, KODE POS<br/>Telp : 021-1234567<br/>Email : billing@perusahaan.net.id</div>
          </div>
          <div style={{ width: "50%" }}>
            <div className="inv-section-title" style={{fontSize: "14px"}}>NPWP PERUSAHAAN</div>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{width:"80px", verticalAlign:"top"}}>Nama</td><td style={{verticalAlign:"top"}}>: PT. NAMA PERUSAHAAN ANDA</td></tr>
                <tr><td style={{verticalAlign:"top"}}>Alamat</td><td style={{verticalAlign:"top"}}>: ALAMAT PERUSAHAAN BARIS 1<br/>KOTA, KODE POS</td></tr>
                <tr><td style={{verticalAlign:"top"}}>NPWP</td><td style={{verticalAlign:"top"}}>: 00.000.000.0-000.000</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <hr style={{ borderTop: "2px solid black", margin: "20px 0" }} />

        {/* To and Info Box */}
        <div className="inv-flex" style={{ marginBottom: "20px" }}>
          <div style={{ width: "50%" }}>
            <div>Kepada Yth,</div>
            <div style={{ fontWeight: "bold", marginTop: "5px", fontSize: "14px" }}>{sub.name.toUpperCase()}</div>
            <div>{sub.address.toUpperCase()}</div>
            {sub.floor && <div>{sub.floor.toUpperCase()}</div>}
            <div style={{ marginTop: "10px" }}>UP : FINANCE</div>
          </div>
          <div className="inv-border-box" style={{ width: "50%", padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{padding:"4px 10px"}}>ID PELANGGAN</td><td style={{padding:"4px 10px"}}>: {sub.id.substring(0,8).toUpperCase()}</td></tr>
                <tr><td style={{padding:"4px 10px"}}>NOMOR INVOICE</td><td style={{padding:"4px 10px"}}>: {invoice.id.substring(0,12).toUpperCase()}</td></tr>
                <tr><td style={{padding:"4px 10px"}}>PERIODE TAGIHAN</td><td style={{padding:"4px 10px"}}>: {tagihanBulan}</td></tr>
                <tr><td style={{padding:"4px 10px"}}>TGL PENAGIHAN</td><td style={{padding:"4px 10px"}}>: {formatTgl(invoice.createdAt)}</td></tr>
                <tr><td style={{padding:"4px 10px"}}>TGL JATUH TEMPO</td><td style={{padding:"4px 10px"}}>: {formatTgl(invoice.dueDate)}</td></tr>
                <tr><td style={{padding:"4px 10px"}}>NPWP PELANGGAN</td><td style={{padding:"4px 10px"}}>: -</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="inv-table-box">
          <table>
            <thead>
              <tr>
                <th>RINCIAN TRANSAKSI</th>
                <th style={{textAlign: "right"}}>JUMLAH TAGIHAN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{sub.product ? sub.product.name.toUpperCase() : "INTERNET BROADBAND"}</td>
                <td style={{textAlign: "right"}}>Rp {(invoice.amount).toLocaleString('en-US')}</td>
              </tr>
              <tr>
                <td>PPN 11%</td>
                <td style={{textAlign: "right"}}>Rp {(invoice.taxAmount).toLocaleString('en-US')}</td>
              </tr>
              <tr>
                <td style={{fontWeight: "bold", paddingTop: "15px"}}>TOTAL KESELURUHAN</td>
                <td style={{textAlign: "right", fontWeight: "bold", paddingTop: "15px"}}>Rp {(invoice.totalAmount).toLocaleString('en-US')}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{borderTop: "1px solid black", fontStyle: "italic"}}>TERBILANG: {terbilangText}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Additional Note */}
        <div className="inv-table-box">
          <div style={{ fontWeight: "bold", padding: "6px 10px" }}>Additional Note :</div>
        </div>

        {/* Footer info */}
        <div className="inv-flex">
          <div style={{ width: "40%" }}>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Pembayaran Melalui :</div>
            <div>NAMA VA BNI Perusahaan - {sub.name.toUpperCase()}</div>
            <table style={{marginTop: "10px"}}>
              <tbody>
                <tr>
                  <td style={{verticalAlign: "top"}}>VIRTUAL<br/>ACCOUNT</td>
                  <td style={{verticalAlign: "top", fontWeight: "bold", paddingLeft: "15px"}}>{invoice.virtualAccount || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="inv-border-box" style={{ width: "60%" }}>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Keterangan :</div>
            <ol style={{ margin: 0, paddingLeft: "15px" }}>
              <li>Mohon Melakukan Pembayaran Sebelum TANGGAL JATUH TEMPO Untuk Menghindari Gangguan atau Penghentian Layanan.</li>
              <li>Cantumkan No. Layanan dan Nama Pelanggan Dikolom Berita Saat Melakukan Pembayaran.</li>
              <li>Kirimkan Bukti Bayar Setelah Pembayaran Ke Email : billing@perusahaan.net.id</li>
              <li>Tagihan Ini Dicetak Secara Otomatis, Maka Tidak Memerlukan Tanda Tangan.</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
}
