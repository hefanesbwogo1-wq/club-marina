export const printReceipt = (elementId: string) => {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 5px; font-family: monospace; width: 80mm; }
          * { color: black!important; }
        </style>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>${content.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};