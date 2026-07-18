# File Storage Rules: Allurite CRM

## Storage Adapter Architecture
To maintain environment isolation, the application must use a file storage adapter pattern:
- **Development**: Local filesystem storage within the project's local temp directory.
- **Production**: Cloud Object Storage (e.g. AWS S3 or Vercel Blob) configured via environment variables.

## Upload Restrictions
- **Maximum File Size**: 
  - Standard attachments (PDFs, docs): Max 5MB.
  - Profile images/brand assets: Max 2MB.
- **Allowed MIME-Types (Whitelist)**:
  - Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Images: `image/jpeg`, `image/png`, `image/webp`
- Block executable files, scripts, or unknown binaries (`.exe`, `.js`, `.bat`, etc.).

## Security & Organization
- Never save files with their original user-uploaded filenames (to avoid directory traversal exploits or collisions). Rename files using UUIDs on upload.
- Store metadata (UUID, original name, file size, mime-type, owner ID, and upload path) inside the MongoDB database.
- Files must inherit permissions from their parent CRM entity (e.g., if a user does not have permission to view a Client, they cannot fetch files attached to that Client).
