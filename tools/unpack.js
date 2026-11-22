// STEP 1 of 3 – unpack the prototype.
//
// The prototype (prototypes/b-infinity-prototype.html) is a single "bundled" HTML file: every image, font and
// script is stored inside it as base64 text (sometimes gzipped), and the page itself is stored as a template that
// refers to those assets by id. This script writes each asset out as a normal file and saves the page as index.html.
//
// Usage:  node tools/unpack.js prototypes/b-infinity-prototype.html <outputFolder>
// Next:   node tools/split.js <outputFolder>
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const [, , bundlePath, outputDir] = process.argv;
fs.mkdirSync(outputDir, { recursive: true });
const bundleHtml = fs.readFileSync(bundlePath, 'utf8');

// The bundle keeps its data in <script type="__bundler/NAME"> tags; returns the text inside one of them.
function readBundlerScript(name) {
  const scriptPattern = new RegExp('<script type="__bundler/' + name + '"[^>]*>([\\s\\S]*?)</script>');
  const match = bundleHtml.match(scriptPattern);
  return match ? match[1] : null;
}

const manifest = JSON.parse(readBundlerScript('manifest')); // { assetId: { data, compressed, mime } }
let pageHtml = JSON.parse(readBundlerScript('template'));    // the page, with asset ids where file URLs go
const externalResources = readBundlerScript('ext_resources');
console.log('ext', externalResources && externalResources.slice(0, 300));

const MAX_EXTENSION_LENGTH = 6;

// Write every asset to disk and point the page at the new file name.
const writtenAssets = [];
for (const [assetId, asset] of Object.entries(manifest)) {
  let bytes = Buffer.from(asset.data, 'base64');
  if (asset.compressed) bytes = zlib.gunzipSync(bytes);

  // "font/woff2" -> "woff2", "application/javascript" -> "javasc"
  const mimeSubtype = (asset.mime || '').split('/')[1];
  const extension = mimeSubtype?.replace(/[^a-z0-9]/gi, '').slice(0, MAX_EXTENSION_LENGTH) || 'bin';
  const fileName = assetId + '.' + extension;

  fs.writeFileSync(path.join(outputDir, fileName), bytes);
  writtenAssets.push([assetId, asset.mime, bytes.length]);
  pageHtml = pageHtml.split(assetId).join(fileName);
}

fs.writeFileSync(path.join(outputDir, 'index.html'), pageHtml);
console.log(writtenAssets.map((row) => row.join(' ')).join('\n'));
console.log('template', pageHtml.length);
