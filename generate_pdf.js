const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlFile = path.resolve(__dirname, 'presentation_doc.html');
const pdfOutput = path.resolve(__dirname, 'SupportX_Presentation_Guide.pdf');
const desktopPdf = path.resolve('C:\\Users\\joelj\\OneDrive\\Desktop\\SupportX_Presentation_Guide.pdf');

console.log('Generating PDF from:', htmlFile);
console.log('Target PDF:', pdfOutput);

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-margins',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfOutput}`,
  htmlFile
];

const res = spawnSync(chromePath, args, { stdio: 'inherit' });

if (fs.existsSync(pdfOutput)) {
  console.log('PDF Generated successfully!');
  const stats = fs.statSync(pdfOutput);
  console.log(`PDF Size: ${stats.size} bytes`);
  
  // Copy to Desktop
  fs.copyFileSync(pdfOutput, desktopPdf);
  console.log('Copied to Desktop:', desktopPdf);
} else {
  console.error('PDF file not created. Exit code:', res.status);
}
