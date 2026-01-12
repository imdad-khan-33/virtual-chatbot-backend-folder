import { Mood } from "../models/mood.model.js";
import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const logMood = asyncHandler(async (req, res) => {
    const { mood, note } = req.body;
    const userId = req.user._id;

    if (mood === undefined || mood < 1 || mood > 10) {
        throw new ApiError(400, "Mood rating must be a number between 1 and 10");
    }

    const newMood = await Mood.create({
        userId,
        mood,
        note,
    });

    if (!newMood) {
        throw new ApiError(500, "Failed to log mood");
    }

    // --- Streak & Gamification Logic ---
    const user = await User.findById(userId);
    if (user) {
        const today = new Date();
        const lastLog = user.lastMoodLogDate ? new Date(user.lastMoodLogDate) : null;

        if (!lastLog) {
            // First time logging
            user.streak = 1;
            // Award "First Step" badge if not already awarded
            if (!user.badges.find(b => b.name === "First Step")) {
                user.badges.push({
                    name: "First Step",
                    description: "Logged your first mood entry!"
                });
            }
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const isSameDay = today.toDateString() === lastLog.toDateString();
            const isYesterday = yesterday.toDateString() === lastLog.toDateString();

            if (isYesterday) {
                user.streak += 1;
                // Award "Habit Builder" badge for 7-day streak
                if (user.streak === 7 && !user.badges.find(b => b.name === "Habit Builder")) {
                    user.badges.push({
                        name: "Habit Builder",
                        description: "Maintained a 7-day mood log streak!"
                    });
                }
            } else if (!isSameDay) {
                // Streak broken (missed at least one full day)
                user.streak = 1;
            }
        }

        user.lastMoodLogDate = today;
        await user.save();
    }

    return res
        .status(201)
        .json(new ApiResponse(201, { mood: newMood, streak: user?.streak, badges: user?.badges }, "Mood logged successfully"));
});

const getMoodHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 30 } = req.query;

    const history = await Mood.find({ userId })
        .sort({ date: -1 })
        .limit(parseInt(limit));

    return res
        .status(200)
        .json(new ApiResponse(200, history, "Mood history retrieved successfully"));
});

const getMoodAnalysis = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const username = req.user.username;

    const history = await Mood.find({ userId })
        .sort({ date: -1 })
        .limit(10); // Analyze pichhle 10 entries

    if (!history || history.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {
                summary: "Start logging your mood to see AI insights!",
                triggers: [],
                tips: ["Try logging your first mood entry today."],
                analysis: "Humein aapka data nahi mila. Please try logging your mood."
            }, "No mood history found for analysis"));
    }

    const { analyzeMoodHistory } = await import("../services/deepSeek.service.js");
    const aiResponse = await analyzeMoodHistory(history, username);

    let parsedContent;
    try {
        parsedContent = JSON.parse(aiResponse.content);
    } catch (error) {
        // Fallback parsing if JSON is not perfect
        parsedContent = {
            summary: "Emotional trends analysis.",
            triggers: ["Identify your triggers"],
            tips: ["Stay mindful"],
            analysis: aiResponse.content
        };
    }

    return res
        .status(200)
        .json(new ApiResponse(200, parsedContent, "Mood analysis generated successfully"));
});

export { logMood, getMoodHistory, getMoodAnalysis };
