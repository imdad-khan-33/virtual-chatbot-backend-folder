import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middlewares.js";
import { 
    getAllUsersNotification, 
    readUserNotification, 
    readAllNotifications, 
    deleteNotification, 
    clearAllNotifications 
} from "../controllers/notification.controller.js";

const router = Router();

// Get all notifications
router.route("/").get(verifyJwt, getAllUsersNotification);

// Mark all notifications as read (must come before /:notificationId routes)
router.route("/read-all").patch(verifyJwt, readAllNotifications);

// Clear all notifications (must come before /:notificationId routes)
router.route("/clear-all").delete(verifyJwt, clearAllNotifications);

// Mark single notification as read
router.route("/read/:notificationId").patch(verifyJwt, readUserNotification);

// Delete single notification
router.route("/:notificationId").delete(verifyJwt, deleteNotification);

export default router;