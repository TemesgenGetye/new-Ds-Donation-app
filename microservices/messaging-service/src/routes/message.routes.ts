import { Request, Response, Router } from "express";
import { body, param, query } from "express-validator";
import { MessageController } from "../controllers/message.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const messageController = new MessageController();

const createMessageValidation = [
  body("sender_id")
    .isUUID()
    .withMessage("Invalid sender_id - must be a valid UUID"),
  body("receiver_id")
    .isUUID()
    .withMessage("Invalid receiver_id - must be a valid UUID"),
  body("content").notEmpty().withMessage("Content is required"),
  body("donation_id").optional().isUUID(),
  body("campaign_id").optional().isUUID(),
];

// Routes
router.post(
  "/",
  createMessageValidation,
  validateRequest,
  (req: Request, res: Response) => messageController.createMessage(req, res)
);

router.get(
  "/",
  [
    query("sender_id").optional().isUUID(),
    query("receiver_id").optional().isUUID(),
    query("donation_id").optional().isUUID(),
    query("campaign_id").optional().isUUID(),
  ],
  validateRequest,
  (req: Request, res: Response) => messageController.getMessages(req, res)
);

router.patch(
  "/:id/read",
  [param("id").isUUID().withMessage("Invalid message ID")],
  validateRequest,
  (req: Request, res: Response) => messageController.markAsRead(req, res)
);

export default router;

