import mongoose from "mongoose";

const moodSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        mood: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        note: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexing userId for faster retrieval of user mood history
moodSchema.index({ userId: 1, date: -1 });

export const Mood = mongoose.model("Mood", moodSchema);
