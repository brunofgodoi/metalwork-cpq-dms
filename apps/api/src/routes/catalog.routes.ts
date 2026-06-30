import { Router } from 'express';
import { StandardDrawingController } from '../controllers/StandardDrawingController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload.middleware';

export const catalogRoutes = Router();
const controller = new StandardDrawingController();

catalogRoutes.use(authMiddleware);

catalogRoutes.get('/standard-drawings', controller.list);
catalogRoutes.get('/standard-drawings/next-code', controller.nextCode);
catalogRoutes.get('/standard-drawings/:id', controller.getById);
catalogRoutes.post('/standard-drawings', controller.create);
catalogRoutes.put('/standard-drawings/:id', controller.update);
catalogRoutes.delete('/standard-drawings/:id', controller.delete);

catalogRoutes.get('/standard-drawings/:id/versions', controller.listVersions);
catalogRoutes.get('/standard-drawings/:id/versions/:version', controller.getVersion);
catalogRoutes.get('/standard-drawings/:id/versions/:version/download', controller.downloadVersion);
catalogRoutes.get(
  '/standard-drawings/:id/versions/:version/download-doc',
  controller.downloadDocVersion,
);
catalogRoutes.post(
  '/standard-drawings/:id/versions',
  upload.fields([
    { name: 'cadFile', maxCount: 1 },
    { name: 'docFile', maxCount: 1 },
  ]),
  controller.createVersion,
);

catalogRoutes.post(
  '/standard-drawings/:id/thumbnail',
  upload.single('thumbnail'),
  controller.uploadThumbnail,
);
