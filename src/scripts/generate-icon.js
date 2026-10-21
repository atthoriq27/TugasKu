import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAppIcon() {
  console.log("Generating TugasKu brand desktop icon...");

  const svgContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 512px;
          height: 512px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }
        .icon-container {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle at 30% 30%, #1e293b, #0b0f19);
          border-radius: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 4px rgba(56, 189, 248, 0.4);
          position: relative;
          overflow: hidden;
        }
        .glow {
          position: absolute;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(37, 99, 235, 0.1) 60%, transparent 80%);
          filter: blur(20px);
        }
        svg {
          width: 270px;
          height: 270px;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 10px 25px rgba(56, 189, 248, 0.6));
        }
      </style>
    </head>
    <body>
      <div class="icon-container">
        <div class="glow"></div>
        <svg viewBox="0 0 24 24" fill="url(#zapGrad)" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="zapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#60a5fa" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>
          </defs>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
    </body>
    </html>
  `;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1
  });

  await page.setContent(svgContent);
  const outDir = path.join(__dirname, "../../desktop");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pngPath = path.join(outDir, "icon.png");
  await page.screenshot({ path: pngPath, omitBackground: true });
  console.log("Saved icon.png to:", pngPath);

  await browser.close();

  // Create icon.ico containing the PNG
  const pngBuf = fs.readFileSync(pngPath);
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type 1 = icon
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoDirEntry = Buffer.alloc(16);
  icoDirEntry.writeUInt8(0, 0); // width: 0 = 256px
  icoDirEntry.writeUInt8(0, 1); // height: 0 = 256px
  icoDirEntry.writeUInt8(0, 2); // color palette
  icoDirEntry.writeUInt8(0, 3); // reserved
  icoDirEntry.writeUInt16LE(1, 4); // color planes
  icoDirEntry.writeUInt16LE(32, 6); // bpp
  icoDirEntry.writeUInt32LE(pngBuf.length, 8); // size
  icoDirEntry.writeUInt32LE(22, 12); // offset (6 + 16)

  const icoBuf = Buffer.concat([icoHeader, icoDirEntry, pngBuf]);
  const icoPath = path.join(outDir, "icon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log("Saved icon.ico to:", icoPath);

  // Also copy to public/icon.png for web favicon
  const publicIconPath = path.join(__dirname, "../../public/icon.png");
  fs.copyFileSync(pngPath, publicIconPath);
  console.log("Copied favicon to:", publicIconPath);
}

generateAppIcon().catch(err => {
  console.error("Error generating icon:", err);
  process.exit(1);
});
