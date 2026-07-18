# Deployment Guide

Follow this guide to deploy the Allurite CRM application to Vercel or any standard Node.js server environment.

---

## ☁️ Deploying to Vercel (Recommended)

Vercel is the native platform for Next.js and integrates out-of-the-box with MongoDB and Vercel Blob storage.

### 1. Set up Vercel Blob
1. Open your Vercel Dashboard.
2. Go to **Storage** and select **Vercel Blob**.
3. Create a new Blob store database.
4. Copy the environment variables generated (specifically `BLOB_READ_WRITE_TOKEN`).

### 2. Import & Deploy
1. Click **Add New Project** on Vercel and link your GitHub repository.
2. In the **Environment Variables** section, add the variables defined in `ENVIRONMENT_SETUP.md`:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `BLOB_READ_WRITE_TOKEN`
3. Click **Deploy**. Vercel will build the project production build and launch.

---

## 🖥️ Deploying to Node.js Server (e.g. VPS, PM2)

If you deploy to a private server:

### 1. Build the Application
Create a clean build directory:
```bash
npm run build
```

### 2. Run with PM2
Launch the production server under PM2 manager:
```bash
pm2 start npm --name "allurite-crm" -- start
```
Ensure your environment variables are configured in the system environment before launching the process.
