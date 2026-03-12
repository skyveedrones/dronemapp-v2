console.log("--- Production Environment Check ---");

if (process.env.RESEND_API_KEY) {
  const key = process.env.RESEND_API_KEY;
  console.log(`✅ RESEND_API_KEY is present.`);
  console.log(`🔍 Key format check: ${key.startsWith('re_') ? 'VALID (starts with re_)' : 'INVALID FORMAT'}`);
} else {
  console.error("❌ ERROR: RESEND_API_KEY is missing from environment variables.");
}

if (process.env.CLOUDINARY_URL) {
  console.log("✅ CLOUDINARY_URL is present.");
} else {
  console.error("❌ ERROR: CLOUDINARY_URL is missing.");
}
