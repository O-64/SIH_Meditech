import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "./routes/user.routes.js";
import genAiRouter from "./routes/genAi.routes.js";
import adminRouter from "./routes/admin.routes.js";
import counsellorRouter from "./routes/counsellor.routes.js";
import { startScheduler } from "./jobs/messageSchedular.js";

const PORT = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.includes("vercel.app") ||
        origin.includes("localhost")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", genAiRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/counsellor", counsellorRouter);

console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  startScheduler();
});
