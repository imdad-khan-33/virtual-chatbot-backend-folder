import mongoose from "mongoose";

const { Schema } = mongoose

const SessionSchema = new Schema({
  weekNumber: Number,
  sessionDate: Date,
  isActive: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date
}, { _id: false });

const SessionScheduleSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    requiered: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    enum: ["weekly", "monthly"],
    default: "weekly",
  },
  nextSessionDate: {
    type: Date,
    required: true,
  },
  sessionDuration: {
    type: String,
    default: "30 mins"
  },
  lastSessionDate: {
    type: Date,
    default: null,
  },
  sessions: [SessionSchema], // ✅ ADD THIS LINE
}, {
  timestamps: true
}
);

export const SessionSchedule = mongoose.model("SessionSchedule", SessionScheduleSchema)