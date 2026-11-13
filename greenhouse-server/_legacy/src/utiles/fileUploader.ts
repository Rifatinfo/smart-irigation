

import multer from "multer";


// 🔥 Use memory storage (you can switch to diskStorage if needed)
const storage = multer.memoryStorage();

// Common multer configuration
const multerConfig = {
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 4, // max 4 files for multiple upload
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
};

// ✅ Single file upload
const singleUpload = (fieldName: string) => multer(multerConfig).single(fieldName);

// ✅ Multiple files upload
const multipleUpload = (fieldName: string, maxCount = 4) => multer(multerConfig).array(fieldName, maxCount);

// Export both
export const fileUploader = {
  singleUpload,
  multipleUpload,
};
