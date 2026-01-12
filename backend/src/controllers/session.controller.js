import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { SessionSchedule } from "../models/sessionSchedule.model.js";
import { User } from "../models/users.model.js";
import { sendNotificationToUser } from "../sockets/index.js";

const markSessionComplete = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const io = req.app.get("io");
    const { sessionId } = req.body || {};

    const schedule = await SessionSchedule.findOne({ userId });

    if (!schedule) {
        throw new ApiError(404, "Session schedule not found for this user");
    }

    // Mark as complete using findOneAndUpdate for better persistence with array elements
    const updatedSchedule = await SessionSchedule.findOneAndUpdate(
        { userId, "sessions.isCompleted": false }, // Find the first incomplete session
        {
            $set: {
                "sessions.$.isCompleted": true,
                "sessions.$.completedAt": new Date(),
                "sessions.$.isActive": false,
                lastSessionDate: new Date()
            }
        },
        { new: true }
    );

    if (!updatedSchedule) {
        return res.status(200).json(new ApiResponse(200, schedule, "No pending sessions found"));
    }

    const completedCount = updatedSchedule.sessions.filter(s => s.isCompleted).length;
    const totalSessions = updatedSchedule.sessions.length;

    // --- Update User Progress & Badges ---
    const user = await User.findById(userId);
    if (user) {
        user.currentSession = completedCount + 1;

        // Award Badge logic
        if (completedCount === Math.floor(totalSessions / 2)) {
            user.badges.push({ name: "Halfway Hero", description: "Completed half of your therapy plan!" });
        } else if (completedCount === totalSessions) {
            user.badges.push({ name: "Warrior", description: "Successfully completed your entire therapy journey!" });
        }

        await user.save();
    }

    // Update next session date logic
    const nextSessionIndex = updatedSchedule.sessions.findIndex(s => !s.isCompleted);

    if (nextSessionIndex !== -1) {
        updatedSchedule.nextSessionDate = updatedSchedule.sessions[nextSessionIndex].sessionDate;
        await updatedSchedule.save();

        // Send notification for partial completion
        try {
            const nextDate = updatedSchedule.nextSessionDate
                ? new Date(updatedSchedule.nextSessionDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                : "soon";

            await sendNotificationToUser(io, userId, {
                title: "Session Completed!",
                message: `Well done! You've finished session ${completedCount} of ${totalSessions}. Your next session is scheduled for ${nextDate}.`,
            });
        } catch (notifError) {
            console.error("Failed to send session completion notification:", notifError.message);
        }
    } else {
        updatedSchedule.nextSessionDate = null;
        await updatedSchedule.save();

        // Send notification for final completion
        try {
            await sendNotificationToUser(io, userId, {
                title: "All Sessions Completed!",
                message: `Congratulations! You have successfully completed your entire therapy plan of ${totalSessions} sessions. You're a true Warrior!`,
            });
        } catch (notifError) {
            console.error("Failed to send final session completion notification:", notifError.message);
        }
    }

    console.log(`Session marked complete for user ${userId}. Statistics: ${completedCount}/${totalSessions}`);

    return res.status(200).json(
        new ApiResponse(200, { schedule: updatedSchedule, userProgress: user?.currentSession }, "Session marked as complete successfully")
    );
});

export { markSessionComplete };


