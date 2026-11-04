import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { VerificationToken } from "@/models/VerificationToken";
import { Habit } from "@/models/Habit";
import { HabitLog } from "@/models/HabitLog";
import { HabitScheduleVersion } from "@/models/HabitScheduleVersion";
import { Goal } from "@/models/Goal";
import { Challenge } from "@/models/Challenge";
import { ChallengeProgress } from "@/models/ChallengeProgress";
import { JournalEntry } from "@/models/JournalEntry";
import { FocusSession } from "@/models/FocusSession";
import { DailyTask } from "@/models/DailyTask";
import { Notification } from "@/models/Notification";
import { NotificationPreference } from "@/models/NotificationPreference";
import { PushSubscription } from "@/models/PushSubscription";
import { UserSetting } from "@/models/UserSetting";
import { UserAchievement } from "@/models/UserAchievement";
import { Subscription } from "@/models/Subscription";
import { AuditLog } from "@/models/AuditLog";
import { hashPassword, comparePassword } from "@/lib/auth";
import dbConnect from "@/lib/database";

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  theme?: "light" | "dark" | "system";
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  aiConsent?: boolean;
  image?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await dbConnect();
  if (input.timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
    } catch {
      throw new Error("Invalid timezone");
    }
  }
  const allowed: (keyof UpdateProfileInput)[] = [
    "name",
    "bio",
    "timezone",
    "language",
    "theme",
    "emailNotifications",
    "pushNotifications",
    "aiConsent",
    "image",
  ];
  const update: any = {};
  for (const key of allowed) {
    if (input[key] !== undefined) update[key] = input[key];
  }
  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select("-passwordHash")
    .lean();
  if (!user) throw new Error("User not found");
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  await dbConnect();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || !user.passwordHash) throw new Error("User not found");
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await AuditLog.create({ userId, action: "password_change", entityType: "User", entityId: userId });
  return { ok: true };
}

/** Permanently remove a user and all of their personal data. */
export async function deleteAccount(userId: string) {
  await dbConnect();
  await Promise.all([
    Session.deleteMany({ userId }),
    VerificationToken.deleteMany({ userId }),
    HabitLog.deleteMany({ userId }),
    HabitScheduleVersion.deleteMany({ userId }),
    Habit.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    ChallengeProgress.deleteMany({ userId }),
    Challenge.deleteMany({ userId }),
    JournalEntry.deleteMany({ userId }),
    FocusSession.deleteMany({ userId }),
    DailyTask.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    NotificationPreference.deleteMany({ userId }),
    PushSubscription.deleteMany({ userId }),
    UserSetting.deleteMany({ userId }),
    UserAchievement.deleteMany({ userId }),
    Subscription.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId });
  await AuditLog.deleteMany({ userId });
  return { ok: true };
}
