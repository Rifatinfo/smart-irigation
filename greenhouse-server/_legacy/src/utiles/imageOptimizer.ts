import sharp from "sharp";
import path from "path";
import fs from "fs";

export const optimizeAndSaveImage = async (
  file: Express.Multer.File,
  folder: string //  dynamic folder
): Promise<string> => {
  const uploadDir = path.join(process.cwd(), "uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}.webp`;

  const filepath = path.join(uploadDir, filename);

  await sharp(file.buffer)
    .resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(filepath);

  return filename;
};
