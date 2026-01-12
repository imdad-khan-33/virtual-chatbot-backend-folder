import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/notification.model.js";

// Get all notifications for the current user
const getAllUsersNotification = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }
    try {
        const allNotification = await Notification.find({ userId }).sort({ createdAt: -1 });
        if (allNotification.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No notifications found"));
        }

        return res.status(200).json(new ApiResponse(200, allNotification, "User notifications fetched successfully"));
    } catch (error) {
        console.log("Something went wrong while getting notifications", error);
        throw new ApiError(500, "Something went wrong while getting notifications");
    }
});

// Mark a single notification as read
const readUserNotification = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { notificationId } = req.params;

    if (!userId) throw new ApiError(400, "User ID is required");
    if (!notificationId) throw new ApiError(400, "Notification ID is required");

    try {
        const readNotification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
        if (!readNotification) {
            throw new ApiError(404, "Notification not found");
        }
        return res.status(200).json(new ApiResponse(200, readNotification, "Notification marked as read"));
    } catch (error) {
        console.log("Something went wrong while reading notification", error);
        throw new ApiError(500, "Something went wrong while reading notification");
    }
});

// Mark all notifications as read for current user
const readAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) throw new ApiError(400, "User ID is required");

    try {
        const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );
        return res.status(200).json(new ApiResponse(200, { modifiedCount: result.modifiedCount }, "All notifications marked as read"));
    } catch (error) {
        console.log("Something went wrong while marking all notifications as read", error);
        throw new ApiError(500, "Something went wrong while marking all notifications as read");
    }
});

// Delete a single notification
const deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { notificationId } = req.params;

    if (!userId) throw new ApiError(400, "User ID is required");
    if (!notificationId) throw new ApiError(400, "Notification ID is required");

    try {
        const deletedNotification = await Notification.findOneAndDelete({ _id: notificationId, userId });
        if (!deletedNotification) {
            throw new ApiError(404, "Notification not found");
        }
        return res.status(200).json(new ApiResponse(200, deletedNotification, "Notification deleted successfully"));
    } catch (error) {
        console.log("Something went wrong while deleting notification", error);
        throw new ApiError(500, "Something went wrong while deleting notification");
    }
});

// Clear all notifications for current user
const clearAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) throw new ApiError(400, "User ID is required");

    try {
        const result = await Notification.deleteMany({ userId });
        return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, "All notifications cleared"));
    } catch (error) {
        console.log("Something went wrong while clearing notifications", error);
        throw new ApiError(500, "Something went wrong while clearing notifications");
    }
});

export { 
    getAllUsersNotification, 
    readUserNotification, 
    readAllNotifications, 
    deleteNotification, 
    clearAllNotifications 
};