import { Router, Request, Response } from "express";
import { body, param, query } from "express-validator";
import { CampaignController } from "../controllers/campaign.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const campaignController = new CampaignController();

// Validation rules
const createCampaignValidation = [
  body("recipient_id")
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage("Invalid recipient_id - must be a valid UUID"),
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("goal_amount").optional().isNumeric(),
  body("collected_amount").optional().isNumeric(),
  body("image_url").optional().isString(),
  body("status").optional().isIn(["pending", "active"]),
];

const updateCampaignValidation = [
  param("id")
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage("Invalid campaign ID"),
  body("title").optional().notEmpty(),
  body("description").optional().notEmpty(),
  body("category").optional().notEmpty(),
  body("location").optional().notEmpty(),
  body("goal_amount").optional().isNumeric(),
  body("collected_amount").optional().isNumeric(),
  body("status")
    .optional()
    .isIn(["pending", "active", "paused", "completed", "rejected"]),
];

const contributeValidation = [
  param("id")
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage("Invalid campaign ID"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
];

// Routes
router.post("/", createCampaignValidation, validateRequest, (req: Request, res: Response) =>
  campaignController.createCampaign(req, res)
);

router.get(
  "/",
  [
    query("status")
      .optional()
      .isIn(["pending", "active", "paused", "completed", "rejected"]),
    query("category").optional().isString(),
    query("recipient_id").optional().isUUID(),
  ],
  validateRequest,
  (req: Request, res: Response) => campaignController.getCampaigns(req, res)
);

router.get(
  "/:id",
  [
    param("id")
      .matches(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      .withMessage("Invalid campaign ID"),
  ],
  validateRequest,
  (req: Request, res: Response) => campaignController.getCampaignById(req, res)
);

router.put("/:id", updateCampaignValidation, validateRequest, (req: Request, res: Response) =>
  campaignController.updateCampaign(req, res)
);

router.post(
  "/:id/contribute",
  contributeValidation,
  validateRequest,
  (req: Request, res: Response) => campaignController.contributeToCampaign(req, res)
);

router.delete(
  "/:id",
  [
    param("id")
      .matches(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      .withMessage("Invalid campaign ID"),
  ],
  validateRequest,
  (req: Request, res: Response) => campaignController.deleteCampaign(req, res)
);

export default router;
