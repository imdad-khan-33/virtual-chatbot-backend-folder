import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      enum: ["Admin", "User"],
    },
    isVerified: { type: Boolean, default: false },
    userImage: {
      type: String
    },
    freePlan: {
      type: Boolean,
      default: true
    },
    premiumPlan: {
      type: Boolean,
      default: false
    },
    currentSession: {
      type: Number,
      default: 1
    },
    streak: {
      type: Number,
      default: 0
    },
    lastMoodLogDate: {
      type: Date
    },
    badges: [
      {
        name: String,
        description: String,
        dateEarned: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next;
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
  //short lived access token
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
UserSchema.methods.generateRefreshToken = function () {
  //short lived access token
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", UserSchema);
