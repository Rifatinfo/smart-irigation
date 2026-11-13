import { Router } from "express";
import { getFacebookFeed } from "./facebookFeed.controller";


const router = Router();
router.get('/facebook-feed', getFacebookFeed);

export const FaceBookFeed = router;