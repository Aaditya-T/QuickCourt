# R2 Bucket Public Access Setup

Your R2 bucket needs to be configured for public read access to display uploaded images.

## Steps to Configure Public Access:

1. **Go to your Cloudflare Dashboard**
   - Navigate to R2 Object Storage
   - Find your `quickcourt-images` bucket

2. **Enable Public Access**
   - Click on your bucket name
   - Go to "Settings" tab
   - Under "Public access", click "Allow Access"
   - This will generate a public R2.dev URL like: `https://pub-[hash].r2.dev`

3. **Update Environment Variable (Optional)**
   - Add `R2_PUBLIC_URL` environment variable with your public URL
   - Format: `https://pub-[your-hash].r2.dev`

4. **Alternative: Custom Domain**
   - You can also set up a custom domain for your R2 bucket
   - This provides better branding and control

## Current Status:
- ✅ Images are uploading successfully to R2
- ❌ Images cannot be viewed due to private bucket access
- 🔧 Need to enable public access or use R2.dev public URL

## Test After Setup:
Once configured, images should be accessible at URLs like:
`https://pub-[your-hash].r2.dev/facilities/[filename]`