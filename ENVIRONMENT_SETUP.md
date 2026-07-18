# Environment Configuration Setup

To run Allurite CRM, you need to configure the following environment variables in a `.env` file located in the root of the project.

---

## 🔑 Environment Variables List

Create a `.env` file:

```env
# MongoDB Connection URI
MONGODB_URI=mongodb+srv://allurite:Youssef2005@cluster0.hb6akdj.mongodb.net/allurite?retryWrites=true&w=majority&appName=Cluster0

# Authentication Token Secret
JWT_SECRET=production_secret_key_change_me_to_something_secure_random_string

# Vercel S3 Blob Storage Credentials (used for secure cloud file uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token_key_here
```

---

## 📝 Descriptions

### `MONGODB_URI`
- The database connection string. Handles schema operations, indices, backups, and settings.

### `JWT_SECRET`
- Secure cryptographic signature key used for user session cookie authentication. Choose a long random key in production.

### `BLOB_READ_WRITE_TOKEN`
- The Vercel Blob read-write access token. Files and system backups are saved directly to this s3 cloud bucket.
