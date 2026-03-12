import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The "Ghost" we are hunting
const SEARCH_TEXT = 'toast.info("Feature coming soon!")';

// The "Live Logic" we are installing
const REPLACEMENT_CODE = `(() => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.png,.jpg';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      // Trigger the existing upload action
      import("@/app/actions/overlay").then(mod => mod.uploadProjectOverlay(formData, window.location.pathname.split("/").pop()));
      setTimeout(() => window.location.reload(), 2000);
    }
  };
  input.click();
})()`;

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(SEARCH_TEXT)) {
        console.log(`🎯 Found placeholder in: ${fullPath}`);
        const updatedContent = content.replace(SEARCH_TEXT, REPLACEMENT_CODE);
        fs.writeFileSync(fullPath, updatedContent, 'utf8');
        console.log(`✅ Fixed!`);
      }
    }
  });
}

console.log("🚀 Starting global placeholder cleanup...");
walkDir(__dirname);
console.log("✨ Done! Every 'Coming Soon' toast has been replaced with the live uploader.");
