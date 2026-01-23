import { Request, Response, Router } from "express";
import { body, param, query } from "express-validator";
import { DonationController } from "../controllers/donation.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const donationController = new DonationController();

// Validation rules
const createDonationValidation = [
  body("donor_id")
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage("Invalid donor_id - must be a valid UUID"),
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("image_url").optional().isString(),
  body("status").optional().isIn(["pending", "available"]),
];

const updateDonationValidation = [
  param("id").isUUID().withMessage("Invalid donation ID"),
  body("title").optional().notEmpty(),
  body("description").optional().notEmpty(),
  body("category").optional().notEmpty(),
  body("location").optional().notEmpty(),
  body("status")
    .optional()
    .isIn(["pending", "available", "claimed", "completed", "rejected"]),
];

// Routes
router.post(
  "/",
  createDonationValidation,
  validateRequest,
  (req: Request, res: Response) => donationController.createDonation(req, res)
);

router.get(
  "/",
  [
    query("status")
      .optional()
      .isIn(["pending", "available", "claimed", "completed", "rejected"]),
    query("category").optional().isString(),
    query("donor_id").optional().isUUID(),
  ],
  validateRequest,
  (req: Request, res: Response) => donationController.getDonations(req, res)
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid donation ID")],
  validateRequest,
  (req: Request, res: Response) => donationController.getDonationById(req, res)
);

router.put(
  "/:id",
  updateDonationValidation,
  validateRequest,
  (req: Request, res: Response) => donationController.updateDonation(req, res)
);

router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid donation ID")],
  validateRequest,
  (req: Request, res: Response) => donationController.deleteDonation(req, res)
);

export default router;
