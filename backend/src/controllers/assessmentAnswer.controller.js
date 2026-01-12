import { AssessmentAnswers } from "../models/assessmentAnswers.model.js";
import { SessionSchedule } from "../models/sessionSchedule.model.js";
import { User } from "../models/users.model.js"; // Added User model
import { initialAssessment } from "../services/deepSeek.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSessionPlan } from "../utils/generateSessionPlan.js";
import { mailSender } from "../utils/mailSender.js";
import { extractJson } from '../utils/commonFunctions.js'
import { sendNotificationToUser } from "../sockets/index.js";
const answers = asyncHandler(async (req, res) => {
  const { response: userAnswers, questionsAndAnswers } = req.body;
  const userId = req?.user?._id;
  const { username } = req?.user;
  const io = req.app.get("io");
  if (!Array.isArray(questionsAndAnswers) || questionsAndAnswers.length === 0) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Invalid or missing questionsAndAnswers array.")
      );
  }

  if (
    !Array.isArray(userAnswers) ||
    userAnswers.length === 0 ||
    userAnswers.some(
      (item) =>
        typeof item.question !== "string" ||
        typeof item.questionId !== "string" ||
        typeof item.answer !== "string" ||
        !item.question.trim() ||
        !item.answer.trim()
    )
  ) {
    throw new ApiError(
      400,
      "Each response must contain a valid questionId and answer."
    );
  }

  if (!userId) {
    throw new ApiError(400, "Invalid user id");
  }
  // Delete existing assessment if it exists to allow re-submission
  await AssessmentAnswers.deleteMany({ userId });
  console.log(` Cleared old assessment answers for user: ${userId}`);

  // ============ AI-POWERED SESSION PLANNING ============
  // Using DeepSeek AI to analyze user's assessment responses
  // and generate a personalized therapy session plan
  console.log(` Requesting AI analysis for user: ${username}`);
  const initialAssessementResponse = await initialAssessment(
    questionsAndAnswers,
    username
  );
  console.log(`AI analysis received for ${username}`);

  if (!initialAssessementResponse?.content) {
    return res.status(500).json({ error: "Invalid GPT response format." });
  }

  const rawGPTResponse = initialAssessementResponse?.content;
  const cleanResponse = extractJson(rawGPTResponse);

  let parsedResponse;
  try {
    console.log(" Parsing AI Response...");
    parsedResponse = JSON.parse(cleanResponse);
    console.log("AI Response parsed successfully.");
  } catch (error) {
    console.warn(" AI Response Parse Failed. Using Static Fallback Plan.");
    console.log("Raw Response received from AI:", rawGPTResponse);
  }

  // Ensure we have a valid object to work with
  if (!parsedResponse || typeof parsedResponse !== "object") {
    parsedResponse = {
      userName: username,
      severityLevel: "moderate",
      primaryConcerns: ["general wellness", "emotional balance"],
      selfCareActivity: {
        description: "Mindful Morning Routine",
        details: [
          "Wake up at 7 AM",
          "10 minutes of journaling",
          "Drink warm water",
        ],
        clinicalRationale:
          "Consistency in morning routines helps regulate the nervous system.",
      },
      sessionRecommendation: {
        frequency: "weekly",
        totalSessions: 8,
        schedule: "one session per week, total 8 sessions",
        reason:
          "Recommended based on standard therapeutic guidelines for initial support.",
      },
      fullText:
        "I've carefully analyzed your responses. Your journey toward balance is a step-by-step process, and I'm here to support you.",
    };
  }

  try {
    const save = await AssessmentAnswers.create({
      userId,
      response: userAnswers,
      initialAssessment: parsedResponse,
      completed: true,
    });
    if (!save) {
      throw new ApiError(400, "Something went wrong while creating ans");
    }

    // --- Badge Logic: First Assessment ---
    try {
      const user = await User.findById(userId);
      if (user) {
        const hasBadge = user.badges.some(b => b.name === "First Assessment");
        if (!hasBadge) {
          user.badges.push({
            name: "First Assessment",
            description: "Completed your initial mental health assessment!"
          });
          await user.save();

          // Optional: Notify user about the badge
          await sendNotificationToUser(io, userId, {
            title: "New Badge Unlocked!",
            message: "You've earned the 'First Assessment' badge for completing your evaluation.",
          });
        }
      }
    } catch (badgeError) {
      console.error("Failed to award First Assessment badge:", badgeError.message);
    }
    const { userName, selfCareActivity, sessionRecommendation, fullText } = parsedResponse;

    // Safe property access with defaults
    const activityTitle = selfCareActivity?.description || "Self-Care Plan";
    const activityDetails = Array.isArray(selfCareActivity?.details) ? selfCareActivity.details : ["Taking time for self-reflection"];
    const activityRationale = selfCareActivity?.clinicalRationale || "Self-care is essential for mental wellness.";
    const recFrequency = sessionRecommendation?.frequency || "weekly";
    const recReason = sessionRecommendation?.reason || "To provide consistent support.";
    const totalSessions = parseInt(sessionRecommendation?.totalSessions) || 6;
    const sessionDuration = "1 min"; // CHANGED FOR TESTING: 1 min instead of sessionRecommendation?.duration || "30 mins"
    const recSchedule = sessionRecommendation?.schedule || `one session per ${recFrequency === 'weekly' ? 'week' : 'month'}, total ${totalSessions} sessions`;
    const noteContent = fullText || "Wishing you the best on your journey.";

    const userEmail = req?.user?.email;
    const title = `Your Initial Assessment & Self-Care Plan `;
    const body = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Hi ${userName?.charAt(0).toUpperCase() + userName?.slice(1) || "there"
      },</p>

    <p>Thank you for completing the assessment! Here’s your personalized self-care plan and our initial thoughts based on your responses:</p>

    <h2 style="color: #4CAF50;"> Self-Care Activity: ${activityTitle}</h2>

    <p><strong>Description:</strong><br>
    A personalized routine designed for your wellbeing.</p>

    <p><strong>Details:</strong></p>
    <ul>
      ${activityDetails.map((item) => `<li>${item}</li>`).join("")}
    </ul>

    <p><strong>Clinical Rationale:</strong><br>
    ${activityRationale}</p>

    <h2 style="color: #4CAF50;">🗓 Session Recommendation</h2>
    <p><strong>Frequency:</strong>  ${recFrequency}</p>
    <p><strong>Reason:</strong><br>
     ${recReason}

     <h2 style="color: #4CAF50;">Personalized Note</h2>
    <blockquote style="border-left: 4px solid #4CAF50; padding-left: 15px; color: #555;">
      ${noteContent}
    </blockquote>
    <p>for more info kindly visit user dashboard</p>
    <p>Warmly,<br>
    <strong>Virtual Therapist</strong></p>
  </div>`;

    console.log(" Sending completion email...");
    // ============ EMAIL SENDING (NON-BLOCKING) ============
    try {
      await mailSender(userEmail, title, body);
      console.log(" Assessment email sent successfully");
    } catch (emailError) {
      console.error(" Failed to send assessment email:", emailError.message);
    }
    // ============ END EMAIL ============

    console.log("Sending socket notification...");
    // ============ NOTIFICATION REMOVED AS IT IS NOW HANDLED IN FRONTEND TOAST ============
    
    try {
      await sendNotificationToUser(io, userId, {
        title: "Initial Assessment Completed",
        message: "Your personalized self-care plan is now available.",
        time: new Date()
      });
      console.log(" Notification sent successfully");
    } catch (notifError) {
      console.error(" Notification failed:", notifError.message);
    }
    
    // ============ END NOTIFICATION ============

    // AI-BASED SESSION SCHEDULING
   // DeepSeek AI has analyzed the user's responses and recommended:
    // - Frequency: ${recFrequency} (weekly/monthly)
    // - Total Sessions: ${totalSessions}
    console.log(` Creating AI-based session schedule...`);
    console.log(` AI Recommendation: ${recFrequency} frequency, ${totalSessions} total sessions`);
    console.log(` This plan is personalized based on user's mental health assessment`);

    const sessions = generateSessionPlan({
      frequency: "minute", // CHANGED FOR TESTING: minute instead of recFrequency
      totalSessions,
      startDate: new Date(),
    });

    console.log(` AI-Generated ${totalSessions} sessions scheduled (${recFrequency})`);
    console.log(` Session dates:`, sessions.map(s => s.sessionDate.toISOString().split('T')[0]));

    // 🧹 Clear existing schedules for this user to avoid stale data
    await SessionSchedule.deleteMany({ userId });
    console.log(`Cleared old session schedules for user: ${userId}`);

    console.log("Creating session schedule in DB...");
    const sessionInfo = await SessionSchedule.create({
      userId,
      userName,
      email: userEmail,
      frequency: recFrequency.toLowerCase(),
      nextSessionDate: sessions[0].sessionDate,
      sessionDuration, // ✅Save duration
      sessions,
    });

    if (!sessionInfo) {
      console.error("Failed to create session info");
      throw new ApiError(400, "something went wrong while creating session");
    }

    // --- Send Notification about the new Session Plan ---
    try {
      const firstSessionDate = new Date(sessions[0].sessionDate).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      await sendNotificationToUser(io, userId, {
        title: "Therapy Plan Ready!",
        message: `Your personalized plan with ${totalSessions} sessions is ready. Your first session is scheduled for ${firstSessionDate}.`,
      });
      console.log("Session plan notification sent");
    } catch (notifError) {
      console.error(" Failed to send session plan notification:", notifError.message);
    }

    console.log("Assessment submission complete!");
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { response: parsedResponse, sessionInfo },
          "initial assesment chatbot response and also assessmet email sent"
        )
      );
  } catch (error) {
    console.error("❌ CRITICAL ERROR in 'answers' controller:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error during assessment submission",
      stack: error.stack
    });
  }
});

const getAllUserAnswer = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;

  if (!userId) {
    throw new ApiError(400, "Invalid user id");
  }

  try {
    const result = await AssessmentAnswers.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } }, // 🕒 Always pick the most recent assessment
      { $limit: 1 }, // 🎯 Only process the latest one

      { $unwind: "$response" }, // Break each response

      {
        $lookup: {
          from: "assessmentquestions", // must match MongoDB collection name
          localField: "response.questionId",
          foreignField: "_id",
          as: "questionDetails",
        },
      },
      { $unwind: "$questionDetails" },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "sessionschedules", // name of the collection to join
          localField: "userId", // field in the current docs
          foreignField: "userId", // field in the other collection
          as: "sessionInfo", // result will be stored in this field
        },
      },
      { $unwind: { path: "$sessionInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          "sessionInfo.frequency": 1,
          "sessionInfo.nextSessionDate": 1,
          "sessionInfo.sessionDuration": 1, // ✅ Project duration
          "sessionInfo.lastSessionDate": 1,
          "sessionInfo.sessions": 1,
          "userDetails.currentSession": 1,
          "userDetails.username": 1,
          "userDetails.email": 1,
          "userDetails.userImage": 1,
          "userDetails.isVerified": 1,
          "userDetails.createdAt": 1,
          response: 1,
          questionDetails: 1,
          userId: 1,
          initialAssessment: 1,
          completed: 1,
          assessmentDate: 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          initialAssessment: { $first: "$initialAssessment" },
          completed: { $first: "$completed" },
          currentSession: { $first: "$userDetails.currentSession" },
          username: { $first: "$userDetails.username" },
          email: { $first: "$userDetails.email" },
          userImage: { $first: "$userDetails.userImage" },
          isVerified: { $first: "$userDetails.isVerified" },
          createdAt: { $first: "$userDetails.createdAt" },
          assessmentDate: { $first: "$assessmentDate" },
          session: { $first: "$sessionInfo" },
          responses: {
            $push: {
              questionNo: "$questionDetails.questionNo",
              questionText: "$questionDetails.text",
              options: "$questionDetails.options",
              selectedAnswer: "$response.answer",
            },
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, result, "No assessment data found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, result[0], "Detailed assessment data fetched")
      );
  } catch (error) {
    console.error("Error fetching detailed assessment:", error);
    throw new ApiError(500, "Error fetching user assessment details");
  }
});

export { answers, getAllUserAnswer };
