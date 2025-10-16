import 'dotenv/config';
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from 'cloudinary';
import path from "path";
import pool, { initDb } from "./database_initialization.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Налаштування multer для збереження в пам'яті (не на диску)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ---------------- HELPERS ----------------
async function loadPosts() {
  try {
    const result = await pool.query(
      'SELECT id, title, description, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt" FROM posts ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (err) {
    console.error("Load posts error:", err.message);
    return [];
  }
}

// Helper to extract Cloudinary public_id from URL
function getCloudinaryPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;

  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/posts/filename.jpg
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    const pathParts = parts[1].split('/');
    // Remove version (v1234567890) if present
    const relevantParts = pathParts.filter(p => !p.startsWith('v') || isNaN(p.substring(1)));

    // Join folder/filename and remove extension
    const publicId = relevantParts.join('/').replace(/\.[^/.]+$/, '');
    return publicId;
  } catch (err) {
    console.error('Error extracting public_id:', err);
    return null;
  }
}

// ---------------- MIDDLEWARE ----------------
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

// Static folder for public assets only
app.use(express.static(path.join(process.cwd(), "public")));

// ---------------- API ----------------

// Get all posts
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await loadPosts();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new post
app.post("/api/posts", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      console.log('📤 Uploading to Cloudinary...');
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'posts',
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
      console.log('✅ Uploaded to Cloudinary:', imageUrl);
    }

    // Accept localized JSON in title/description if provided
    let title = req.body.title;
    let description = req.body.description;
    try { if (typeof title === 'string' && title.trim().startsWith('{')) title = JSON.parse(title); } catch {}
    try { if (typeof description === 'string' && description.trim().startsWith('{')) description = JSON.parse(description); } catch {}

    const result = await pool.query(
      'INSERT INTO posts (title, description, image_url) VALUES ($1, $2, $3) RETURNING id, title, description, image_url as "imageUrl", created_at as "createdAt"',
      [title, description, imageUrl]
    );

    const post = result.rows[0];

    // Server log for post creation
    const timestamp = new Date().toISOString();
    const titleText = typeof title === 'object' ? title.en || title.uk || 'Untitled' : title || 'Untitled';
    console.log(`📝 ADMIN: Post created [${timestamp}] ID: ${post.id}, Title: "${titleText}"`);

    res.json(post);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update post
app.put("/api/posts/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing post
    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    let imageUrl = existing.rows[0].image_url;

    if (req.file) {
      console.log('📤 Uploading to Cloudinary...');

      // Delete old image from Cloudinary if exists
      if (imageUrl) {
        const publicId = getCloudinaryPublicId(imageUrl);
        if (publicId) {
          console.log('🗑️ Deleting old image from Cloudinary:', publicId);
          await cloudinary.uploader.destroy(publicId).catch(err =>
            console.error('Cloudinary delete error:', err)
          );
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'posts',
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
      console.log('✅ Uploaded to Cloudinary:', imageUrl);
    }

    let title = req.body.title;
    let description = req.body.description;
    try { if (typeof title === 'string' && title.trim().startsWith('{')) title = JSON.parse(title); } catch {}
    try { if (typeof description === 'string' && description.trim().startsWith('{')) description = JSON.parse(description); } catch {}

    title = title || existing.rows[0].title;
    description = description || existing.rows[0].description;

    const result = await pool.query(
      'UPDATE posts SET title = $1, description = $2, image_url = $3, updated_at = NOW() WHERE id = $4 RETURNING id, title, description, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"',
      [title, description, imageUrl, id]
    );

    const post = result.rows[0];

    // Server log for post update
    const timestamp = new Date().toISOString();
    const titleText = typeof title === 'object' ? title.en || title.uk || 'Untitled' : title || 'Untitled';
    console.log(`📝 ADMIN: Post updated [${timestamp}] ID: ${id}, Title: "${titleText}"`);

    res.json(post);
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const post = existing.rows[0];

    // Server log for post deletion (before deletion)
    const timestamp = new Date().toISOString();
    const titleText = typeof post.title === 'object' ? post.title.en || post.title.uk || 'Untitled' : post.title || 'Untitled';
    console.log(`📝 ADMIN: Post deleted [${timestamp}] ID: ${id}, Title: "${titleText}"`);

    // Delete from Cloudinary if URL exists
    if (post.image_url) {
      const publicId = getCloudinaryPublicId(post.image_url);
      if (publicId) {
        console.log('🗑️ Deleting from Cloudinary:', publicId);
        await cloudinary.uploader.destroy(publicId).catch(err =>
          console.error('Cloudinary delete error:', err)
        );
      }
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import local posts (sync button) - migrate existing data
app.post("/api/import", async (req, res) => {
  try {
    const locals = req.body.posts || [];

    for (const post of locals) {
      await pool.query(
        'INSERT INTO posts (title, description, image_url, created_at) VALUES ($1, $2, $3, $4)',
        [post.title, post.description, post.imageUrl, post.createdAt || new Date().toISOString()]
      );
    }

    res.json({ ok: true, imported: locals.length });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- START ----------------
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});