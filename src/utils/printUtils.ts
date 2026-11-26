import { showWarningToast } from './alerts';

const MI_LOGO_PATH = '/assets/aistudio/Logo_MI_Rowosari_2_b88f498f.png';

/**
 * Builds the official Kop Surat HTML for "MI ISLAMIYAH ROWOSARI"
 * matching the uploaded Lembaga Pendidikan Ma'arif NU format.
 */
export function buildOfficialKopHtml(
  origin: string,
  options?: { compact?: boolean }
): string {
  const compact = Boolean(options?.compact);
  const logoUrl = `${origin}${MI_LOGO_PATH}`;

  const wrapMinHeight = compact ? '64px' : '78px';
  const logoSize = compact ? '60px' : '74px';
  const sidePadding = compact ? '68px' : '82px';
  const f1 = compact ? '11.5px' : '13.5px';
  const f2 = compact ? '16px' : '19px';
  const f3 = compact ? '11.5px' : '13.5px';
  const f4 = compact ? '8.8px' : '10px';
  const f5 = compact ? '9.2px' : '10.5px';
  const f6 = compact ? '9.2px' : '10.5px';
  const f7 = compact ? '9.2px' : '10.5px';
  const ruleMargin = compact ? '3px 0 8px 0' : '4px 0 14px 0';

  return `
    <div style="position:relative;width:100%;min-height:${wrapMinHeight};display:flex;align-items:center;justify-content:center;padding-bottom:4px;">
      <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);width:${logoSize};height:${logoSize};display:flex;align-items:center;justify-content:center;">
        <img src="${logoUrl}" alt="Logo MI Islamiyah Rowosari" style="width:100%;height:100%;object-fit:contain;" />
      </div>
      <div style="width:100%;text-align:center;padding:0 ${sidePadding};font-family:'Century Gothic','Trebuchet MS',Arial,Helvetica,sans-serif;line-height:1.22;color:#000000;">
        <div style="font-size:${f1};font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">LEMBAGA PENDIDIKAN MA’ARIF NU</div>
        <div style="font-size:${f2};font-weight:800;letter-spacing:0.4px;text-transform:uppercase;margin:1px 0;">“MI ISLAMIYAH ROWOSARI”</div>
        <div style="font-size:${f3};font-weight:700;text-transform:uppercase;">BADAN HUKUM PERKUMPULAN NAHDLATUL ULAMA</div>
        <div style="font-size:${f4};font-weight:700;text-transform:uppercase;margin-top:1px;">SK MENKUMHAM NO. AHU-119.AH.01.08 TAHUN 2013</div>
        <div style="font-size:${f5};font-weight:700;margin-top:1px;">Status : Terakreditasi B, NSM : 111233250075, NPSN : 60713227</div>
        <div style="font-size:${f6};font-weight:700;color:#2563eb;margin-top:1px;">e-mail : <a href="mailto:miirowosari@yahoo.co.id" style="color:#2563eb;text-decoration:underline;">miirowosari@yahoo.co.id</a> / <a href="mailto:miirowosari@gmail.com" style="color:#2563eb;text-decoration:underline;">miirowosari@gmail.com</a></div>
        <div style="font-size:${f7};font-weight:700;font-style:italic;margin-top:1px;">Alamat : Jl. Masjid Adiloko, No.03, Rt.04/Rw.04, Rowosari, Limpung, Batang</div>
      </div>
    </div>
    <div style="border-top:3px solid #000000;border-bottom:1px solid #000000;height:5px;margin:${ruleMargin};"></div>
  `;
}

/**
 * Injects a non-printable preview toolbar and auto-print script (which waits for
 * images such as Google Drive student photos to finish loading) into the HTML document.
 */
function injectAboutBlankPrintHelpers(htmlContent: string): string {
  const toolbarStyle = `
    <style id="mi-print-toolbar-style">
      @media print {
        .mi-no-print-bar { display: none !important; }
        body { padding-top: 0 !important; }
      }
      @media screen {
        body { padding-top: 56px !important; }
        .mi-no-print-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 99999;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.25);
        }
        .mi-no-print-bar .mi-bar-title {
          font-weight: 800;
          letter-spacing: 0.4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mi-no-print-bar .mi-bar-badge {
          background: #059669;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .mi-no-print-bar .mi-bar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mi-no-print-bar button {
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
        }
        .mi-btn-print {
          background: #10b981;
          color: #ffffff;
        }
        .mi-btn-print:hover { background: #059669; }
        .mi-btn-close {
          background: #334155;
          color: #e2e8f0;
        }
        .mi-btn-close:hover { background: #475569; }
      }
    </style>
  `;

  const toolbarMarkup = `
    <div class="mi-no-print-bar">
      <div class="mi-bar-title">
        <span class="mi-bar-badge">Pratinjau Cetak</span>
        <span>Dokumen Siap Cetak • MI Islamiyah Rowosari</span>
      </div>
      <div class="mi-bar-actions">
        <button type="button" class="mi-btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
        <button type="button" class="mi-btn-close" onclick="window.close()">Tutup</button>
      </div>
    </div>
  `;

  const autoPrintScript = `
    <script>
      (function() {
        var printed = false;
        function runPrint() {
          if (printed) return;
          printed = true;
          try {
            window.focus();
            window.print();
          } catch (e) {}
        }
        window.addEventListener('load', function() {
          var imgs = Array.prototype.slice.call(document.images || []);
          var pending = imgs.filter(function(img) { return !img.complete; });
          if (pending.length === 0) {
            setTimeout(runPrint, 350);
            return;
          }
          var doneCount = 0;
          function onImgSettled() {
            doneCount++;
            if (doneCount >= pending.length) {
              setTimeout(runPrint, 250);
            }
          }
          pending.forEach(function(img) {
            img.addEventListener('load', onImgSettled);
            img.addEventListener('error', onImgSettled);
          });
          setTimeout(runPrint, 1500);
        });
      })();
    </script>
  `;

  let result = htmlContent;
  if (result.includes('</head>')) {
    result = result.replace('</head>', `${toolbarStyle}</head>`);
  } else {
    result = toolbarStyle + result;
  }

  if (result.includes('<body>')) {
    result = result.replace('<body>', `<body>${toolbarMarkup}`);
  } else {
    result = result.replace(/<body([^>]*)>/i, `<body$1>${toolbarMarkup}`);
  }

  if (result.includes('</body>')) {
    result = result.replace('</body>', `${autoPrintScript}</body>`);
  } else {
    result = result + autoPrintScript;
  }

  return result;
}

/**
 * Opens an about:blank print preview tab/window with a print toolbar and
 * automatically triggers the browser print dialog once images load.
 * Falls back to a hidden iframe if popups are blocked.
 */
export function printHtmlDocument(htmlContent: string): void {
  const enhancedHtml = injectAboutBlankPrintHelpers(htmlContent);

  const printWin = window.open('about:blank', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(enhancedHtml);
    printWin.document.close();
    printWin.focus();
    return;
  }

  // Fallback if popup blocker prevents about:blank tab
  showWarningToast('Popup diblokir browser. Izinkan popup untuk membuka tab about:blank, beralih ke cetak langsung.');

  const existingFrame = document.getElementById('mi-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'mi-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[PrintUtils] Failed to trigger print:', err);
    }
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 60000);
  };

  iframe.onload = () => {
    setTimeout(triggerPrint, 450);
  };
  setTimeout(() => {
    if (document.getElementById('mi-print-iframe') === iframe) {
      triggerPrint();
    }
  }, 1000);
}
