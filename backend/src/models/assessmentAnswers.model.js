import mongoose from "mongoose";

const { Schema } = mongoose;

const AssessmentAnswerSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
    },

    response: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AssessmentQuestion",
          required: true,
        },
        question: {
          type: String,
          required: true,
        },
        answer: {
          type: String,
          required: true,
        },
      },
    ],

    initialAssessment: {
      userName: { type: String },
      selfCareActivity: {
        description: { type: String },
        details: [String],
        clinicalRationale: { type: String },
      },
      sessionRecommendation: {
        frequency: { type: String },
        schedule: { type: String },
        reason: { type: String },
      },
      fullText: { type: String },
    },

    completed: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

export const AssessmentAnswers = mongoose.model(
  "AssessmentAnswers",
  AssessmentAnswerSchema
);
