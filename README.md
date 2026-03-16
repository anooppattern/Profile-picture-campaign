# Profile Picture Generator

A web tool to create campaign profile pictures for social media. Admins upload PNG templates with transparent areas, and users overlay their photos with zoom/pan/rotate controls.

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Usage

### Admin Panel (`/admin`)
1. Login with the admin password (default: `admin123`)
2. Upload campaign template PNGs (must have transparent center area)
3. Manage templates — activate, deactivate, or delete

### User Flow (`/`)
1. Browse available templates
2. Click a template to open the editor
3. Upload your profile photo
4. Adjust with zoom, pan, and rotate controls (or drag/scroll on canvas)
5. Download the composited image

## Configuration

Edit `.env.local` to change the admin password:

```
ADMIN_PASSWORD=your_password_here
```

## Tech Stack

- Next.js (App Router)
- SQLite (better-sqlite3)
- Tailwind CSS
- HTML5 Canvas for client-side image compositing
