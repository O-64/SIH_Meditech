import multer from "multer";

// Configure in-memory storage for Cloudinary streaming
const storage = multer.memoryStorage();

export const uploadCertificateMiddleware = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept standard image and PDF documents
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF medical certificates are allowed"), false);
    }
  },
});
