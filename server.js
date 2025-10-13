import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Шлях до JSON у спеціальній директорії поряд із кодом
const DATA_DIR = path.join(process.cwd(), "data");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

// Налаштування multer для збереження зображень у /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, unique);
  },
});
const upload = multer({ storage });

// ---------------- HELPERS ----------------
function loadPosts() {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, "utf-8");
      return JSON.parse(data).posts || [];
    }
    return [];
  } catch (err) {
    console.error("Load posts error:", err.message);
    return [];
  }
}

function savePosts(posts) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts }, null, 2));
}

function nextId(posts) {
  return (
    Math.max(0, ...posts.map((p) => parseInt(p.id || "0", 10))) + 1
  ).toString();
}

// ---------------- MIDDLEWARE ----------------
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.static(path.join(process.cwd(), "public")));

// ---------------- API ----------------

// Get all posts
app.get("/api/posts", (req, res) => {
  const posts = loadPosts();
  res.json(posts);
});

// Create new post
app.post("/api/posts", upload.single("image"), (req, res) => {
  try {
    const posts = loadPosts();
    const id = nextId(posts);

    let imageUrl = "";
    if (req.file) {
      imageUrl = "/uploads/" + req.file.filename;
    }

    // Accept localized JSON in title/description if provided
    let title = req.body.title;
    let description = req.body.description;
    try { if (typeof title === 'string' && title.trim().startsWith('{')) title = JSON.parse(title); } catch {}
    try { if (typeof description === 'string' && description.trim().startsWith('{')) description = JSON.parse(description); } catch {}

    const post = {
      id,
      title,
      description,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    posts.unshift(post);
    savePosts(posts);
    
    // Server log for post creation
    const timestamp = new Date().toISOString();
    const titleText = typeof title === 'object' ? title.en || title.uk || 'Untitled' : title || 'Untitled';
    console.log(`📝 ADMIN: Post created [${timestamp}] ID: ${id}, Title: "${titleText}"`);
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update post
app.put("/api/posts/:id", upload.single("image"), (req, res) => {
  try {
    const posts = loadPosts();
    const idx = posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    if (req.file) {
      posts[idx].imageUrl = "/uploads/" + req.file.filename;
    }

    let title = req.body.title;
    let description = req.body.description;
    try { if (typeof title === 'string' && title.trim().startsWith('{')) title = JSON.parse(title); } catch {}
    try { if (typeof description === 'string' && description.trim().startsWith('{')) description = JSON.parse(description); } catch {}
    posts[idx].title = title || posts[idx].title;
    posts[idx].description = description || posts[idx].description;
    posts[idx].updatedAt = new Date().toISOString();

    savePosts(posts);
    
    // Server log for post update
    const timestamp = new Date().toISOString();
    const titleText = typeof posts[idx].title === 'object' ? posts[idx].title.en || posts[idx].title.uk || 'Untitled' : posts[idx].title || 'Untitled';
    console.log(`📝 ADMIN: Post updated [${timestamp}] ID: ${req.params.id}, Title: "${titleText}"`);
    
    res.json(posts[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
app.delete("/api/posts/:id", (req, res) => {
  try {
    const posts = loadPosts();
    const idx = posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    // Server log for post deletion (before deletion)
    const timestamp = new Date().toISOString();
    const titleText = typeof posts[idx].title === 'object' ? posts[idx].title.en || posts[idx].title.uk || 'Untitled' : posts[idx].title || 'Untitled';
    console.log(`📝 ADMIN: Post deleted [${timestamp}] ID: ${req.params.id}, Title: "${titleText}"`);

    // видаляємо зображення якщо є
    if (posts[idx].imageUrl) {
      const relative = posts[idx].imageUrl.replace(/^\//, "");
      const filePath = path.join(process.cwd(), relative);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    posts.splice(idx, 1);
    savePosts(posts);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import local posts (sync button)
app.post("/api/import", (req, res) => {
  try {
    const locals = req.body.posts || [];
    savePosts(locals);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});