'use client';

import React from 'react';
import useSWR from 'swr';
import { 
  CreditCard, Loader2, AlertCircle, Clock, 
  CheckCircle2, AlertTriangle, ArrowUpRight, Download, FileText
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface InvoiceItem {
  id: string;
  invoice_no: string;
  amount: number;
  status: 'GENERATED' | 'PAID' | 'PENDING';
  created_at: string;
  bookings: {
    service_items: {
      name: string;
    };
    created_at: string;
  };
}

export default function CustomerInvoicesPage() {
  const { data, error, isLoading } = useSWR('/api/customer/invoices', fetcher);
  const { data: profileData } = useSWR('/api/customer/profile', fetcher);

  const clientName = profileData?.full_name || 'Valued Customer';
  const clientAddress = profileData?.address || '';
  const clientEmail = profileData?.email || '';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-emerald-50 text-emerald-600 border border-emerald-150 font-mono">Paid</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-600 border border-amber-150 font-mono">Pending</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-50 text-slate-650 border border-slate-200 font-mono">Generated</span>;
    }
  };

  const handleDownloadInvoice = (inv: InvoiceItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date(inv.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <html>
        <head>
          <title>Invoice - ${inv.invoice_no}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2e3a47; margin: 0; padding: 40px; }
            .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); padding: 35px; border-radius: 16px; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #124E66; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { display: flex; align-items: center; gap: 10px; }
            .logo img { height: 42px; width: 42px; border-radius: 8px; object-fit: contain; }
            .logo-text { font-size: 24px; font-weight: 900; color: #124E66; letter-spacing: -1px; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { margin: 0; color: #124E66; font-size: 26px; font-weight: 900; letter-spacing: 0.5px; }
            .invoice-title p { margin: 5px 0 0; font-size: 11px; color: #748D92; font-weight: bold; font-family: monospace; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; line-height: 1.6; }
            .details h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #748D92; letter-spacing: 1px; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 35px; }
            .table th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #748D92; }
            .table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .totals { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-size: 13px; margin-top: 10px; }
            .totals div { display: flex; width: 260px; justify-content: space-between; padding: 4px 0; }
            .totals .grand-total { font-size: 16px; font-weight: 900; color: #124E66; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 5px; }
            .status-pill { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: 9px; font-weight: bold; text-transform: uppercase; border: 1px solid; font-family: monospace; }
            .status-paid { background-color: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
            .status-pending { background-color: #fef3c7; border-color: #fde68a; color: #92400e; }
            .footer { border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 550; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="logo">
                <img src="${window.location.origin}/images/logo.jpeg" alt="VOLO">
                <span class="logo-text">VOLO</span>
              </div>
              <div class="invoice-title">
                <h1>INVOICE</h1>
                <p>#${inv.invoice_no}</p>
              </div>
            </div>

            <div class="details">
              <div>
                <h3>Bill To</h3>
                <strong>${clientName}</strong><br>
                ${clientAddress || 'No address details provided'}<br>
                ${clientEmail || ''}
              </div>
              <div style="text-align: right;">
                <h3>Invoice Details</h3>
                <strong>Date Issued:</strong> ${formattedDate}<br>
                <strong>Status:</strong> 
                <span class="status-pill ${inv.status === 'PAID' ? 'status-paid' : 'status-pending'}">
                  ${inv.status}
                </span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${inv.bookings?.service_items?.name || 'Home Service Repair'}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Professional technician service call</span>
                  </td>
                  <td style="text-align: right; font-weight: bold;">₹${Number(inv.amount).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div>
                <span style="color: #64748b;">Subtotal:</span>
                <span style="font-weight: 600;">₹${Number(inv.amount).toFixed(2)}</span>
              </div>
              <div class="grand-total">
                <span>Grand Total:</span>
                <span>₹${Number(inv.amount).toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              Thank you for choosing VOLO Home Services.<br>For questions or support, contact us at support@volo.com.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <CreditCard className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Billing Ledger
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Access, review, and download digital invoices generated upon completion of home services.
          </p>
        </div>
      </div>

      {/* 2. INVOICES GRID */}
      {isLoading ? (
        <div className="py-24 text-center">
          <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider font-mono">Fetching invoices list...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50/50 border border-red-200 p-6 rounded-[24px] text-center text-xs text-red-500 font-semibold font-mono">
          Failed to load invoices records.
        </div>
      ) : !data.invoices || data.invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center select-none space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-450">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-black text-slate-900 text-xs">No Invoices Found</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
              Receipt bills will automatically generate here once a technician marks a service complete.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {data.invoices.map((invoice: InvoiceItem) => (
            <div
              key={invoice.id}
              className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm flex flex-col justify-between hover:border-slate-350 hover:shadow-md transition-all duration-300 border-l-[4px] border-l-[#748D92]"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[9px] font-mono font-bold text-[#124E66] block uppercase tracking-wider">
                    {invoice.invoice_no}
                  </span>
                  <h3 className="font-display font-bold text-sm text-slate-900 leading-snug truncate">
                    {invoice.bookings?.service_items?.name || 'Service Completed'}
                  </h3>
                  <span className="text-[9px] text-slate-450 font-bold font-mono block select-none">
                    Issued: {new Date(invoice.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="text-right space-y-1.5 shrink-0 select-none">
                  <span className="text-xs font-black text-[#124E66] block font-mono">
                    {formatCurrency(Number(invoice.amount))}
                  </span>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>

              {/* DOWNLOAD BUTTON FOOTER */}
              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100/80">
                <button
                  onClick={() => handleDownloadInvoice(invoice)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-[#124E66]" />
                  Download Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
