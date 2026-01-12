import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const TherapyChatSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionType: {
    type: String,
    enum: ["therapy_chat"],
    default: "therapy_chat",
  },
  title: { type: String, default: "Virtual Therapy Chat" },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
},
{
  timestamps: true
});


export const TherapyChat = mongoose.model("TherapyChat",TherapyChatSchema)