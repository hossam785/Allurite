# Desktop App Rules: Allurite CRM

## Core Desktop Target
If Allurite CRM is packaged as a desktop application:
- **Preferred Framework**: Tauri (Rust-based frontend wrapper) to ensure minimal resource overhead and small binary sizes.
- **Strict Constraint**: System integration should be isolated and secure. Do not expose arbitrary terminal execution commands to the web frontend.

## Security & IPC (Inter-Process Communication)
- Restrict Tauri commands to a strict whitelist in `src-tauri/tauri.conf.json`.
- All data transit between Rust host and web frontend must go through typed serialization protocols.
- Restrict remote URLs: Only load assets from local compiled resources or explicitly whitelisted secure API domains.

## Resources & Packaging
- Single binary output for Windows (.msi / .exe).
- Keep memory usage under 150MB during normal operations.
- Avoid spawning persistent background system tasks on the host unless requested.
