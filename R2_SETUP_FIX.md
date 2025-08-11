# Quick Fix for "Blocked by ORB" Error

## The Problem
Cloudflare's Object Request Blocking (ORB) is preventing direct access to your R2 bucket images.

## Solution 1: Use R2.dev Domain (Easiest)

1. **Go to Cloudflare Dashboard → R2 Object Storage**
2. **Click on your `quickcourt-images` bucket**
3. **Go to "Settings" tab**
4. **Look for "Public URL" or "R2.dev"**
5. **Copy the R2.dev URL** (looks like `https://pub-<hash>.r2.dev`)

6. **Add to your `.env` file:**
   ```bash
   R2_DEV_URL=pub-<your-hash>
   # OR
   R2_PUBLIC_URL=https://pub-<your-hash>.r2.dev
   ```

## Solution 2: Custom Domain (Professional)

1. **Go to Cloudflare Dashboard → R2 Object Storage**
2. **Click on your bucket → Settings → Custom Domains**
3. **Add a custom domain** (e.g., `images.yourdomain.com`)
4. **Add to your `.env` file:**
   ```bash
   R2_PUBLIC_URL=https://images.yourdomain.com
   ```

## Test the Fix

1. **Restart your server** after updating environment variables
2. **Upload a new image** to test
3. **Check the browser console** for the new R2 configuration log
4. **Try opening the image URL directly** in a new tab

## Current Environment Variables Needed

```bash
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=quickcourt-images
R2_DEV_URL=pub-<your-hash>  # OR
R2_PUBLIC_URL=https://your-custom-domain.com
```

## Why This Happens

- **Direct R2 URLs** are blocked by ORB for security
- **R2.dev domains** are public and accessible
- **Custom domains** give you full control over access
