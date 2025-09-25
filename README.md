# MetalFrame Landing + Admin

Run a simple Node server to power the admin panel with image uploads and CRUD. Storage is local-only and lives alongside the source code.

## Setup

1. Install Node.js 18+.
2. In this folder, run:

```bash
npm install
npm run start
```

Server starts at `http://localhost:3000`.

## Usage

- Public site: open `http://localhost:3000/index.html`
- Admin panel: open `http://localhost:3000/admin.html` (share only with authorized users)

### Admin features

- Create a post with image, title, description
- Edit a post (optionally replace image)
- Delete a post (removes image file)
- All images saved under `/uploads`

### Data & Storage

- Posts are stored at `data/posts.json`. The `data/` folder is auto-created.
- Images are saved under `/uploads/` and served at `/uploads/<filename>`.
- Deleting a post removes its image file from `/uploads/` if present.

> Note: This is a simple demo. For production, add authentication and a database, and consider versioning `posts.json`.


