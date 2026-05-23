import express from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import cors from "cors";

// Ensure 'public' directory exists
const publicDir = path.join(process.cwd(), "public");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(publicDir, { recursive: true });
      cb(null, publicDir);
    } catch (err) {
      cb(err as Error, publicDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = `photo_${Date.now()}${ext}`;
    cb(null, id);
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Helper to read and write JSON files safely
  const readJson = async (filename: string) => {
    try {
      const data = await fs.readFile(path.join(publicDir, filename), "utf8");
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };

  const writeJson = async (filename: string, data: any) => {
    await fs.writeFile(path.join(publicDir, filename), JSON.stringify(data, null, 2), "utf8");
  };

  const ADMIN_ID = "kuttysoft";
  const ADMIN_PW = "Password@2026";
  const AUTH_TOKEN = "admin-secret-token";

  app.post("/api/admin/login", (req, res) => {
    const { id, password } = req.body;
    if (id === ADMIN_ID && password === ADMIN_PW) {
      res.json({ token: AUTH_TOKEN });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token === AUTH_TOKEN) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // API endpoints
  app.get("/api/gallery", async (req, res) => {
    const meta = await readJson("meta.json") || [];
    res.json(meta);
  });

  app.post("/api/gallery", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { description } = req.body;
    const filename = req.file.filename;

    try {
      // 1. Update meta.json
      const meta = await readJson("meta.json") || [];
      meta.push({ id: filename, description: description || "" });
      await writeJson("meta.json", meta);

      // 2. Update sphere.json (random coordinates around 0.5)
      const sphere = await readJson("sphere.json") || {};
      sphere[filename] = [
        0.5 + (Math.random() - 0.5) * 0.2,
        0.5 + (Math.random() - 0.5) * 0.2,
        0.5 + (Math.random() - 0.5) * 0.2,
      ];
      await writeJson("sphere.json", sphere);

      // 3. Update umap-grid.json (random coordinates between 0 and 1)
      const umapGrid = await readJson("umap-grid.json") || {};
      umapGrid[filename] = [Math.random(), Math.random()];
      await writeJson("umap-grid.json", umapGrid);

      res.json({ id: filename, description });
    } catch (error) {
      res.status(500).json({ error: "Failed to persist image metadata" });
    }
  });

  app.delete("/api/gallery/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
      // 1. Update meta.json
      let meta = await readJson("meta.json") || [];
      meta = meta.filter((m: any) => m.id !== id);
      await writeJson("meta.json", meta);

      // 2. Update sphere.json
      const sphere = await readJson("sphere.json") || {};
      delete sphere[id];
      await writeJson("sphere.json", sphere);

      // 3. Update umap-grid.json
      const umapGrid = await readJson("umap-grid.json") || {};
      delete umapGrid[id];
      await writeJson("umap-grid.json", umapGrid);

      // 4. Delete the physical file
      try {
        await fs.unlink(path.join(publicDir, id));
      } catch (err) {
        console.warn("Could not delete file:", id);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  app.post("/api/gallery/batch-delete", requireAuth, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid ids array" });

    try {
      // 1. Update meta.json
      let meta = await readJson("meta.json") || [];
      const idsToDelete = new Set(ids);
      meta = meta.filter((m: any) => !idsToDelete.has(m.id));
      await writeJson("meta.json", meta);

      // 2. Update sphere.json & umap-grid.json
      const sphere = await readJson("sphere.json") || {};
      const umapGrid = await readJson("umap-grid.json") || {};

      for (const id of ids) {
        delete sphere[id];
        delete umapGrid[id];
        // 3. Delete physical files
        try {
          await fs.unlink(path.join(publicDir, id));
        } catch (err) {
          console.warn("Could not delete file:", id);
        }
      }

      await writeJson("sphere.json", sphere);
      await writeJson("umap-grid.json", umapGrid);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch delete images" });
    }
  });

  app.get("/api/data", async (req, res) => {
    const [meta, sphere, umapGrid] = await Promise.all([
      readJson("meta.json").catch(() => []),
      readJson("sphere.json").catch(() => ({})),
      readJson("umap-grid.json").catch(() => ({}))
    ]);
    res.json({ meta, sphere, umapGrid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve public folder for dynamically uploaded images that aren't built into dist
    app.use(express.static(publicDir));
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
