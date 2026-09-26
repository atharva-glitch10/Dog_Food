import { Router } from 'express';
import { galleryController } from './gallery.controller.js';

const router = Router();

router.get('/events/:eventId/gallery', galleryController.getGallery);

export default router;
