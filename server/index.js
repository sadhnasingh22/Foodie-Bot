require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
});

const generationConfigJson = {
  responseMimeType: "application/json",
};

function stripJsonFence(text) {
  if (!text || typeof text !== "string") return text;
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/s, "");
  }
  return t.trim();
}

async function generateJsonPrompt(systemInstruction, userPayload) {
  const prompt = `${systemInstruction}\n\nInput data:\n${userPayload}\n\nRespond with valid JSON only, no markdown.`;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: generationConfigJson,
  });
  const raw = result.response.text();
  const cleaned = stripJsonFence(raw);
  return JSON.parse(cleaned);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// File Upload Setup
const upload = multer({
  storage: multer.memoryStorage(),
});

const MENU_ADVISOR_SYSTEM = `You are FoodieBot's Menu Advisor Agent 🍽️. You evaluate customer dining experiences and food orders.

Given a customer's order details and feedback, you must:
1. Evaluate the dining experience quality (1-10 score)
2. Identify what dishes they enjoyed and why
3. Suggest 3 personalized dish recommendations for their next visit based on their taste profile
4. Provide specific feedback on each dish ordered (taste, presentation, value)
5. Identify any dietary preferences or restrictions from their behavior

Return a structured JSON object with exactly these keys:
- experience_score (number 1-10)
- enjoyed_dishes (array of strings)
- recommendations (array of exactly 3 objects, each with "dish" and "reason")
- dish_feedback (object mapping dish name strings to feedback strings)
- taste_profile (string)
- improvement_notes (string)
- recommendation (string: one of "Pass", "Revise", "Redo" based on experience_score: Pass if >=8, Revise if 6-7, Redo if below 6)
- recommendation_reason (string, one sentence)
- feedback_message (string, warm summary for the diner)
- criteria (array of exactly 5 objects, each with name, score 1-10, details string, positives array of strings, improvements array of strings — cover Taste, Presentation, Value, Service, Overall Experience)

Be warm, food-passionate, and specific. Think like a Michelin-star food critic who loves helping people discover great food.`;

const RESTAURANT_ANALYTICS_SYSTEM = `You are FoodieBot's Restaurant Analytics Agent 📊. You generate weekly restaurant performance reports.

Given the weekly data (orders, ratings, popular dishes, revenue, customer feedback), you must:
1. Calculate overall restaurant performance score (1-100)
2. Identify the Top 3 best-performing dishes of the week
3. Identify the Bottom 3 underperforming dishes
4. Analyze customer satisfaction trends
5. Provide 5 actionable recommendations to improve performance next week
6. Highlight any standout moments (e.g., viral dish, high repeat customer rate)

Return structured JSON with exactly these keys:
- performance_score (number 1-100)
- top_dishes (array of up to 3 strings)
- underperforming_dishes (array of up to 3 strings)
- satisfaction_trend (string)
- recommendations (array of exactly 5 strings)
- weekly_highlight (string)
- revenue_insights (string)

Also include keys mapped for the client UI:
- student_name (copy from input restaurant_name)
- week (string, from input week_number or "Weekly period")
- progress_score (same number as performance_score)
- summary (string combining satisfaction_trend and revenue_insights briefly)
- encouragement (string, enthusiastic closing drawn from weekly_highlight)
- report_snippet (string, multi-line shareable summary with score and top dishes)
- next_week_focus (array of 5 strings, same as recommendations)

Be data-driven but also enthusiastic about food excellence.`;

const CHEF_READINESS_SYSTEM = `You are FoodieBot's Chef Readiness Agent 👨‍🍳. You evaluate whether a dish is ready to be promoted to "Chef's Special" status on the featured menu.

Given a dish's data (recipe consistency score, customer rating average, presentation score, ingredient quality, preparation time, profit margin), evaluate:

Assign one of three tiers:
- TIER 3 – FEATURED READY: Dish consistently scores 8+/10, has 50+ positive reviews, and maintains quality standards. Ready for Chef's Special promotion. Alert the Head Chef.
- TIER 2 – ALMOST THERE: Dish scores 6-7/10. Solid potential but needs minor refinements. Provide specific improvement tasks.
- TIER 1 – NEEDS WORK: Dish scores below 6/10. Significant improvement needed before featuring. Provide detailed remediation plan.

Return structured JSON with exactly these keys:
- tier (number 1, 2, or 3 only)
- tier_label (string: "FEATURED READY – Chef's Special!", "ALMOST THERE – Minor Refinements Needed", or "NEEDS WORK – Not Ready for Feature")
- overall_score (number 1-10)
- strengths (array of strings)
- improvement_areas (array of strings)
- action_items (array of strings)
- estimated_feature_ready_date (string)
- chef_notes (string, executive summary)

Also include compatibility aliases:
- readiness_tier (same number as tier)
- readiness_report (same string as chef_notes)
- recommended_project (string: promotion line e.g. Chef's Special eligibility)
- mentor_pairing (string: Head Chef / Kitchen Team next step or date)
- skills_to_strengthen (same array as improvement_areas)
- quality_gaps (same array as improvement_areas)
- feature_tier (same as tier)
- feature_ready (boolean, true if tier === 3)
- student_name (echo chef_name from input)
- dish_name (echo dish identifier from input)`;

// Home Route
app.get("/", (req, res) => {
  res.send("🍽️ FoodieBot Server Running Successfully");
});

// Gemini Test Route
app.get("/api/test", async (req, res) => {
  try {
    const result = await model.generateContent("Hello Gemini");

    res.json({
      success: true,
      response: result.response.text(),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Menu Advisor — POST /api/evaluate
app.post("/api/evaluate", upload.single("submission_file"), async (req, res) => {
  try {
    let fileNote = "";
    if (req.file && req.file.buffer) {
      fileNote = `\n[Uploaded file: ${req.file.originalname}]\n${req.file.buffer.toString("utf8").slice(0, 12000)}`;
    }

    const submission =
      req.body.submission_text || "No order details provided";

    const context = [
      req.body.week ? `Customer name: ${req.body.week}` : "",
      req.body.module ? `Dish / order name: ${req.body.module}` : "",
      req.body.assignment_type ? `Order type: ${req.body.assignment_type}` : "",
      req.body.rubric ? `Dietary preferences / criteria: ${req.body.rubric}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userPayload = `${context}\n\nOrder details & dining experience:\n${submission}${fileNote}`;

    const evaluation = await generateJsonPrompt(MENU_ADVISOR_SYSTEM, userPayload);

    res.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Menu Advisor evaluation error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Chef Readiness — POST /api/evaluate-readiness
app.post("/api/evaluate-readiness", async (req, res) => {
  try {
    const {
      student_name,
      gate_project_scores,
      attendance_percentage,
      self_resolution_rate,
      peer_feedback,
    } = req.body;

    const chefName = student_name || "Chef";
    const dishName = gate_project_scores || "Dish";

    const payload = `
Chef / staff name: ${chefName}
Dish name: ${dishName}
Metrics (rating avg / consistency): attendance_percentage field: ${attendance_percentage}
Positive reviews / resolution metric: ${self_resolution_rate}
Dish performance narrative: ${peer_feedback || "Not provided"}
`;

    const evaluation = await generateJsonPrompt(CHEF_READINESS_SYSTEM, payload);

    evaluation.customerName = chefName;
    evaluation.chef_name = chefName;
    evaluation.dish_name = dishName;
    evaluation.readiness_tier = evaluation.tier ?? evaluation.readiness_tier;
    evaluation.readiness_report =
      evaluation.chef_notes || evaluation.readiness_report || "";
    evaluation.recommended_project =
      evaluation.recommended_project ||
      evaluation.tier_label ||
      "Chef's Special eligibility review";
    evaluation.mentor_pairing =
      evaluation.mentor_pairing ||
      evaluation.estimated_feature_ready_date ||
      "Kitchen Improvement Team";
    evaluation.skills_to_strengthen =
      evaluation.improvement_areas ||
      evaluation.skills_to_strengthen ||
      evaluation.action_items ||
      [];

    res.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Chef Readiness evaluation error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Restaurant Analytics — POST /api/generate-report
app.post("/api/generate-report", async (req, res) => {
  try {
    const {
      student_name,
      week_number,
      attendance,
      assignment_scores,
      doubt_history,
      milestone_progress,
    } = req.body;

    const restaurantName = student_name || "Restaurant";

    const payload = `
Restaurant name: ${restaurantName}
Week / period: ${week_number || "Current week"}
Foot traffic / covers summary: ${attendance || "Not specified"}
Dish / station metrics: ${assignment_scores || "Not specified"}
Customer feedback & incidents: ${doubt_history || "Not specified"}
Operations milestones: ${milestone_progress || "Not specified"}
`;

    const report = await generateJsonPrompt(RESTAURANT_ANALYTICS_SYSTEM, payload);

    report.student_name = report.student_name || restaurantName;
    report.week = report.week || week_number || "Weekly period";

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Restaurant Analytics report error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🍽️ FoodieBot server running on http://localhost:${PORT}`);
});
