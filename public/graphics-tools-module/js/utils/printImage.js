/**
 * Wywołuje okno drukowania obrazu
 * @param {string} imgSrc 
 */
export default function printImage(imgSrc) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
  
    document.body.appendChild(iframe);
  
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${imgSrc}" />
        </body>
      </html>
    `);
    doc.close();
  
    iframe.contentWindow.focus();
    iframe.onload = () => {
      const printedImg = doc.querySelector('img');

      printedImg.onload = () => {
        iframe.contentWindow.print();
   
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 100);
      };

      if (printedImg.complete) {
        printedImg.onload();
      }
    };
  }
  