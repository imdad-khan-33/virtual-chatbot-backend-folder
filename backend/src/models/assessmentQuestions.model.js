import mongoose from "mongoose";

const { Schema } = mongoose;

const AssessmentQuestionSchema = new Schema(
  {
    questionNo: {
      type: String,
      required: true,
      unique: true,
    },

    text: { type: String, required: true, trim: true, unique: true },
    options: {
      type: [String],
      required: true,
    },
  },
  {
    timeStamp: true
  }
);

export const AssessmentQuestions = mongoose.model(
  "AssessmentQuestions",
  AssessmentQuestionSchema
);
