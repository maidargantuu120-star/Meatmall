import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { runFullRestore, scheduleRegularBackups, verifyDataIntegrity } from "./backup";
import { checkDatabaseConnection, db } from "./db";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { products } from "@shared/schema";

// Set BASE_URL - fallback to Replit domain if custom domain unavailable
if (!process.env.BASE_URL) {
  // Try custom domain first, fallback to Replit domain
  process.env.BASE_URL = "https://gerinmah.replit.app";
  console.log("BASE_URL set to:", process.env.BASE_URL);
  console.log("Note: Custom domain www.arvijix.kr currently unavailable");
}

const app = express();

// Enable gzip compression for all responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Compress JSON, HTML, CSS, JS, and text responses
    return compression.filter(req, res);
  }
}));

// Enhanced CORS headers for mobile compatibility
app.use((req, res, next) => {
  // Allow credentials for session cookies
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Set-Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Vary', 'Origin');
  
  // Additional mobile compatibility headers
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory with fallback
app.use('/uploads', express.static(path.resolve('./public/uploads')));

// Fallback middleware for missing images - try to restore from data directory
app.use('/uploads/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const publicFile = path.resolve(`./public/uploads/${filename}`);
  const dataFile = path.resolve(`./data/uploads/${filename}`);
  
  // If file doesn't exist in public but exists in data, copy it
  if (!fs.existsSync(publicFile) && fs.existsSync(dataFile)) {
    try {
      const publicDir = path.dirname(publicFile);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.copyFileSync(dataFile, publicFile);
      console.log(`✅ Restored missing image on-demand: ${filename}`);
      return res.sendFile(publicFile);
    } catch (error) {
      console.error(`❌ Failed to restore image ${filename}:`, error);
    }
  }
  
  // If still not found, continue to 404
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Enhanced function to restore ALL images from data directory to public directory for permanent access
async function restoreAllImages() {
  console.log("🔄 Starting comprehensive image restoration process...");
  
  try {
    const dataUploadsDir = './data/uploads';
    const publicUploadsDir = './public/uploads';
    
    // Ensure both directories exist
    if (!fs.existsSync(dataUploadsDir)) {
      fs.mkdirSync(dataUploadsDir, { recursive: true });
      console.log('📁 Created data/uploads directory');
    }
    
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
      console.log('📁 Created public/uploads directory');
    }
    
    // Count variables for reporting
    let restoredCount = 0;
    let alreadyExistCount = 0;
    let failedCount = 0;
    let backedUpToDataCount = 0;
    
    // First pass: Copy all files from data to public
    if (fs.existsSync(dataUploadsDir)) {
      const dataFiles = fs.readdirSync(dataUploadsDir);
      
      for (const filename of dataFiles) {
        const dataFilePath = path.join(dataUploadsDir, filename);
        const publicFilePath = path.join(publicUploadsDir, filename);
        
        // Skip if it's not a file
        const stats = fs.statSync(dataFilePath);
        if (!stats.isFile()) continue;
        
        // Check if file already exists in public directory
        if (fs.existsSync(publicFilePath)) {
          alreadyExistCount++;
          continue;
        }
        
        // Copy file from data to public directory
        try {
          fs.copyFileSync(dataFilePath, publicFilePath);
          console.log(`✅ Restored image to public folder: ${filename}`);
          restoredCount++;
        } catch (copyError) {
          console.error(`❌ Failed to restore image: ${filename}`, copyError);
          failedCount++;
        }
      }
    }
    
    // Second pass: Back up any public files that don't exist in data (for completeness)
    if (fs.existsSync(publicUploadsDir)) {
      const publicFiles = fs.readdirSync(publicUploadsDir);
      
      for (const filename of publicFiles) {
        const dataFilePath = path.join(dataUploadsDir, filename);
        const publicFilePath = path.join(publicUploadsDir, filename);
        
        // Skip if it's not a file
        const stats = fs.statSync(publicFilePath);
        if (!stats.isFile()) continue;
        
        // If file doesn't exist in data directory, back it up
        if (!fs.existsSync(dataFilePath)) {
          try {
            fs.copyFileSync(publicFilePath, dataFilePath);
            console.log(`💾 Backed up image to data folder: ${filename}`);
            backedUpToDataCount++;
          } catch (copyError) {
            console.error(`❌ Failed to backup image: ${filename}`, copyError);
          }
        }
      }
    }
    
    console.log(`🎉 Image restoration complete! Restored: ${restoredCount}, Already existed: ${alreadyExistCount}, Backed up: ${backedUpToDataCount}, Failed: ${failedCount}`);
    
    // Check for missing product images
    try {
      const products = await storage.getProducts();
      let missingProductImages = 0;
      
      for (const product of products) {
        if (product.imageUrl && product.imageUrl.startsWith('/uploads/')) {
          const filename = product.imageUrl.replace('/uploads/', '');
          const dataFilePath = path.resolve(`./data/uploads/${filename}`);
          
          if (!fs.existsSync(dataFilePath)) {
            console.log(`⚠️  Product image missing from storage: ${filename} (Product: ${product.name}, ID: ${product.id})`);
            missingProductImages++;
          }
        }
      }
      
      if (missingProductImages > 0) {
        console.log(`⚠️  Found ${missingProductImages} product images missing from permanent storage`);
      }
    } catch (productCheckError) {
      console.error('Error checking product images:', productCheckError);
    }
    
    return { 
      success: true, 
      restored: restoredCount, 
      alreadyExisted: alreadyExistCount, 
      backedUp: backedUpToDataCount,
      failed: failedCount 
    };
  } catch (error) {
    console.error("❌ Error during image restoration:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

(async () => {
  // Set up authentication before registering routes
  setupAuth(app);
  
  // Add static file serving with optimized caching for uploads
  app.use('/uploads', express.static('./public/uploads', {
    maxAge: '1d', // 1 day cache
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set specific cache for images
      if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // 1 day
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }
  }));
  
  const server = await registerRoutes(app);
  
  // First restore all images to ensure they are available
  const imageRestoreResult = await restoreAllImages();
  console.log("Automatic image restoration completed on server start:", imageRestoreResult);

  // Initialize data persistence system - re-enabled after successful restoration
  try {
    console.log('Data persistence system enabled');
    // Schedule backups every 15 minutes for high data durability
    scheduleRegularBackups(15);
    console.log('Data persistence system initialized');
  } catch (error) {
    console.error('Error initializing data persistence system:', error);
  }

  // Check database connection every hour
  setInterval(checkDatabaseConnection, 60 * 60 * 1000);
  
  // Restore all images every 15 minutes to ensure they're always available
  setInterval(() => {
    restoreAllImages().then(result => {
      console.log('Scheduled image restoration completed:', result);
    }).catch(error => {
      console.error('Scheduled image restoration failed:', error);
    });
  }, 15 * 60 * 1000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
