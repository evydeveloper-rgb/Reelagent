import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.hourly("daily videos", { minuteUTC: 0 }, internal.daily.tick, {});
export default crons;
