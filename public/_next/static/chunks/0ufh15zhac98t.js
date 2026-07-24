(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,16857,e=>{"use strict";let t=(0,e.i(49591).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);e.s(["Loader2",0,t],16857)},10689,e=>{"use strict";let t=(0,e.i(49591).default)("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);e.s(["Download",0,t],10689)},70318,e=>{"use strict";var t=e.i(23011),o=e.i(36554),s=e.i(58398),a=e.i(16857),i=e.i(10689);let n=e=>fetch(e).then(e=>e.json());e.s(["default",0,function(){let{data:e,error:r,isLoading:l}=(0,o.default)("/api/customer/invoices",n),{data:d}=(0,o.default)("/api/customer/profile",n),c=d?.full_name||"Valued Customer",p=d?.address||"",x=d?.email||"";return(0,t.jsxs)("div",{className:"space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]",children:[(0,t.jsxs)("div",{className:"bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up",children:[(0,t.jsx)("div",{className:"absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none"}),(0,t.jsxs)("div",{className:"relative z-10 space-y-2",children:[(0,t.jsxs)("h1",{className:"text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5",children:[(0,t.jsx)(s.CreditCard,{className:"h-5.5 w-5.5 text-[#D3D9D4]"}),"Billing Ledger"]}),(0,t.jsx)("p",{className:"text-xs text-[#D3D9D4] font-medium max-w-xl",children:"Access, review, and download digital invoices generated upon completion of home services."})]})]}),l?(0,t.jsxs)("div",{className:"py-24 text-center",children:[(0,t.jsx)(a.Loader2,{className:"h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3"}),(0,t.jsx)("p",{className:"text-xs font-semibold text-slate-450 uppercase tracking-wider font-mono",children:"Fetching invoices list..."})]}):r?(0,t.jsx)("div",{className:"bg-red-50/50 border border-red-200 p-6 rounded-[24px] text-center text-xs text-red-500 font-semibold font-mono",children:"Failed to load invoices records."}):e.invoices&&0!==e.invoices.length?(0,t.jsx)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up",children:e.invoices.map(e=>{let o;return(0,t.jsxs)("div",{className:"bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm flex flex-col justify-between hover:border-slate-350 hover:shadow-md transition-all duration-300 border-l-[4px] border-l-[#748D92]",children:[(0,t.jsxs)("div",{className:"flex justify-between items-start gap-4",children:[(0,t.jsxs)("div",{className:"space-y-1.5 min-w-0 flex-1",children:[(0,t.jsx)("span",{className:"text-[9px] font-mono font-bold text-[#124E66] block uppercase tracking-wider",children:e.invoice_no}),(0,t.jsx)("h3",{className:"font-display font-bold text-sm text-slate-900 leading-snug truncate",children:e.bookings?.service_items?.name||"Service Completed"}),(0,t.jsxs)("span",{className:"text-[9px] text-slate-450 font-bold font-mono block select-none",children:["Issued: ",new Date(e.created_at).toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric"})]})]}),(0,t.jsxs)("div",{className:"text-right space-y-1.5 shrink-0 select-none",children:[(0,t.jsx)("span",{className:"text-xs font-black text-[#124E66] block font-mono",children:(o=Number(e.amount),new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(o))}),(e=>{switch(e){case"PAID":return(0,t.jsx)("span",{className:"px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-emerald-50 text-emerald-600 border border-emerald-150 font-mono",children:"Paid"});case"PENDING":return(0,t.jsx)("span",{className:"px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-600 border border-amber-150 font-mono",children:"Pending"});default:return(0,t.jsx)("span",{className:"px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-50 text-slate-650 border border-slate-200 font-mono",children:"Generated"})}})(e.status)]})]}),(0,t.jsx)("div",{className:"flex justify-end pt-4 mt-4 border-t border-slate-100/80",children:(0,t.jsxs)("button",{onClick:()=>(e=>{let t=window.open("","_blank");if(!t)return;let o=new Date(e.created_at).toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"}),s=`
      <html>
        <head>
          <title>Invoice - ${e.invoice_no}</title>
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
                <p>#${e.invoice_no}</p>
              </div>
            </div>

            <div class="details">
              <div>
                <h3>Bill To</h3>
                <strong>${c}</strong><br>
                ${p||"No address details provided"}<br>
                ${x||""}
              </div>
              <div style="text-align: right;">
                <h3>Invoice Details</h3>
                <strong>Date Issued:</strong> ${o}<br>
                <strong>Status:</strong> 
                <span class="status-pill ${"PAID"===e.status?"status-paid":"status-pending"}">
                  ${e.status}
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
                    <strong>${e.bookings?.service_items?.name||"Home Service Repair"}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Professional technician service call</span>
                  </td>
                  <td style="text-align: right; font-weight: bold;">₹${Number(e.amount).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div>
                <span style="color: #64748b;">Subtotal:</span>
                <span style="font-weight: 600;">₹${Number(e.amount).toFixed(2)}</span>
              </div>
              <div class="grand-total">
                <span>Grand Total:</span>
                <span>₹${Number(e.amount).toFixed(2)}</span>
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
    `;t.document.write(s),t.document.close()})(e),className:"flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-sm",children:[(0,t.jsx)(i.Download,{className:"h-3.5 w-3.5 text-[#124E66]"}),"Download Invoice"]})})]},e.id)})}):(0,t.jsxs)("div",{className:"bg-white border border-slate-200 rounded-[24px] p-12 text-center select-none space-y-4 shadow-sm",children:[(0,t.jsx)("div",{className:"h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-450",children:(0,t.jsx)(s.CreditCard,{className:"h-6 w-6"})}),(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsx)("h4",{className:"font-display font-black text-slate-900 text-xs",children:"No Invoices Found"}),(0,t.jsx)("p",{className:"text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold",children:"Receipt bills will automatically generate here once a technician marks a service complete."})]})]})]})}])}]);