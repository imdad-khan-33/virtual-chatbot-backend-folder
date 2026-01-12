import { AssessmentQuestions } from "../models/assessmentQuestions.model.js";
import { AssessmentAnswers } from "../models/assessmentAnswers.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const questions = asyncHandler(async (req, res) => {
  const { questionNo, text, options } = req.body;

  if (
    typeof questionNo !== "string" ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.some((opt) => typeof opt !== "string" || !opt.trim())
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existing = await AssessmentQuestions.findOne({$or: [{ questionNo }, { text }]});
  if (existing) {
    console.log("existing: ", existing);
    throw new ApiError(400, "Question with this id already exist");
  }

  try {
    const createQuestions = await AssessmentQuestions.create({
      questionNo,
      text,
      options,
    });

    if (!createQuestions) {
      throw new ApiError(400, "something went wrong while creating questions");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(201, createQuestions, "Question created successfully")
      );
  } catch (error) {
    console.log("something went wrong while creating questions", error);
    throw new ApiError(500, "something went wrong while creating questions");
  }
});

const getQuestions = asyncHandler(async (req, res) => {
  try {
    const allQuestions = await AssessmentQuestions.find();
    if (allQuestions.length === 0) {
      return res.status(200).json(new ApiResponse(200, null, "No question found"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, allQuestions, "All question fetched successfully")
      );
  } catch (error) {
    console.log("something went wrong while fetching all questions", error);
    throw new ApiError(
      500,
      "something went wrong while fetching all questions"
    );
  }
});


export { questions, getQuestions };
