import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';

// Ensure upload folders exist
const UPLOADS_BASE_DIR = path.join(process.cwd(), 'uploads');
const CAD_DIR = path.join(UPLOADS_BASE_DIR, 'cad');
const THUMBNAILS_DIR = path.join(UPLOADS_BASE_DIR, 'thumbnails');
const DOCS_DIR = path.join(UPLOADS_BASE_DIR, 'docs');

if (!fs.existsSync(CAD_DIR)) {
  fs.mkdirSync(CAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'cadFile') {
      cb(null, CAD_DIR);
    } else if (file.fieldname === 'docFile') {
      cb(null, DOCS_DIR);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, THUMBNAILS_DIR);
    } else {
      cb(new AppError('Campo de arquivo inválido.', 400), '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'cadFile') {
    const allowedCAD = ['.dwg', '.dxf', '.pdf'];
    if (allowedCAD.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Arquivo CAD deve ser .dwg, .dxf ou .pdf.', 400));
    }
  } else if (file.fieldname === 'docFile') {
    const allowedDoc = ['.pdf', '.doc', '.docx'];
    if (allowedDoc.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Documento deve ser .pdf, .doc ou .docx.', 400));
    }
  } else if (file.fieldname === 'thumbnail') {
    const allowedImages = ['.png', '.jpg', '.jpeg'];
    if (allowedImages.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Thumbnail deve ser imagem (.png, .jpg, .jpeg).', 400));
    }
  } else {
    cb(new AppError('Campo de arquivo não reconhecido.', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
