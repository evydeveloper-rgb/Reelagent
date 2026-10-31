import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const get = internalQuery({
  args: { userId: v.id("users") },
  handler: (ctx, { userId }) => ctx.db.get(userId),
});

export const patch = internalMutation({
  args: { userId: v.id("users"), fields: v.any() },
  handler: (ctx, { userId, fields }) => ctx.db.patch(userId, fields),
});

/** Validates an id that came in a URL. */
export const normalize = internalQuery({
  args: { id: v.string() },
  handler: (ctx, { id }) => ctx.db.normalizeId("users", id),
});
