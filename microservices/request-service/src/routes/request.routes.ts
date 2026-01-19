import { Request, Response, Router } from "express";
import { body, param, query } from "express-validator";
import { RequestController } from "../controllers/request.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const requestController = new RequestController();

const createRequestValidation = [
  body("donation_id")
    .isUUID()
    .withMessage("Invalid donation_id - must be a valid UUID"),
  body("recipient_id")
    .isUUID()
    .withMessage("Invalid recipient_id - must be a valid UUID"),
  body("message").notEmpty().withMessage("Message is required"),
  body("status")
    .optional()
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Invalid status"),
];

const updateRequestValidation = [
  param("id").isUUID().withMessage("Invalid request ID"),
  body("message").optional().notEmpty(),
  body("status")
    .optional()
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Invalid status"),
];

// Routes
router.post(
  "/",
  createRequestValidation,
  validateRequest,
  (req: Request, res: Response) => requestController.createRequest(req, res)
);

router.get(
  "/",
  [
    query("donation_id").optional().isUUID(),
    query("recipient_id").optional().isUUID(),
    query("status")
      .optional()
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  (req: Request, res: Response) => requestController.getRequests(req, res)
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid request ID")],
  validateRequest,
  (req: Request, res: Response) => requestController.getRequestById(req, res)
);

router.put(
  "/:id",
  updateRequestValidation,
  validateRequest,
  (req: Request, res: Response) => requestController.updateRequest(req, res)
);

export default router;

