import mongoose from "mongoose";
import dotenv from "dotenv";
import { AssessmentQuestions } from "./src/models/assessmentQuestions.model.js";

dotenv.config({ path: './.env' });

const questions = [
    {
        questionNo: "1",
        text: "How often have you been bothered by feeling nervous, anxious, or on edge over the last 2 weeks?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        questionNo: "2",
        text: "How often have you been bothered by not being able to stop or control worrying?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        questionNo: "3",
        text: "How often have you been bothered by little interest or pleasure in doing things?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        questionNo: "4",
        text: "How often have you been bothered by feeling down, depressed, or hopeless?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        questionNo: "5",
        text: "How would you rate your sleep quality recently?",
        options: ["Very Good", "Good", "Fair", "Poor", "Very Poor"]
    },
    {
        questionNo: "6",
        text: "How often do you feel overwhelmed by your daily responsibilities?",
        options: ["Never", "Rarely", "Sometimes", "Often", "Always"]
    },
    {
        questionNo: "7",
        text: "How satisfied are you with your current work-life balance?",
        options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Clear existing questions to avoid duplicates/conflicts
        await AssessmentQuestions.deleteMany({});
        console.log("Cleared existing questions");

        await AssessmentQuestions.insertMany(questions);
        console.log("✅ Assessment questions seeded successfully!");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDB();
