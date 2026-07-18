# Installation Guide

Follow these steps to run the Allurite CRM application in your local development environment.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js**: Version 18.x or newer.
2. **MongoDB**: A running local MongoDB instance or a remote MongoDB Atlas database URL.
3. **npm**: Included with Node.js.

---

## 🚀 Setup Steps

### 1. Clone & Navigate
Navigate to your project root directory:
```bash
cd CRM
```

### 2. Install Packages
Install the package dependencies:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory. Refer to [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for details.

### 4. Seed SuperAdmin Credentials
Run the seeding script to register the initial SuperAdmin credentials in the database:
```bash
node seed-admin.js
```
*Note: Make sure your MongoDB URI is correctly defined in `.env` before running this script.*

### 5. Launch Development Server
Start the local server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
