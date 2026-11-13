// src/app/modules/facebookFeed/facebookFeed.controller.ts
import { Request, Response } from "express";
import { getActiveProducts, buildXMLFeed } from "./facebookFeed.service";
import httpStatus from "http-status";
import { catchAsync } from "../../middlewares/catchAsync";


export const getFacebookFeed = catchAsync(async (req: Request, res: Response) => {
    const products = await getActiveProducts();
    const xml = await buildXMLFeed(products);

    res.header("Content-Type", "text/xml");
    res.status(httpStatus.OK).send(xml);
});