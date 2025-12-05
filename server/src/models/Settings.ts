import mongoose, { Schema, Document } from 'mongoose';

export interface IReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM"
}

export interface ISleepConfig {
  targetHours: number;
  bedTime: string;
  wakeTime: string;
  bedTimeReminderEnabled: boolean;
  wakeAlarmEnabled: boolean;
}

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  waterGoal: number;
  mealReminders: {
    breakfast: IReminderConfig;
    lunch: IReminderConfig;
    dinner: IReminderConfig;
  };
  sleep: ISleepConfig;
}

const ReminderSchema = new Schema<IReminderConfig>({
  enabled: Boolean,
  time: String,
});

const SleepSchema = new Schema<ISleepConfig>({
  targetHours: Number,
  bedTime: String,
  wakeTime: String,
  bedTimeReminderEnabled: Boolean,
  wakeAlarmEnabled: Boolean,
});

const SettingsSchema = new Schema<ISettings>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  waterGoal: { type: Number, default: 2500 },
  mealReminders: {
    breakfast: { type: ReminderSchema, default: { enabled: false, time: '09:00' } },
    lunch: { type: ReminderSchema, default: { enabled: false, time: '13:00' } },
    dinner: { type: ReminderSchema, default: { enabled: false, time: '19:00' } },
  },
  sleep: {
    type: SleepSchema,
    default: {
      targetHours: 8,
      bedTime: '23:00',
      wakeTime: '07:00',
      bedTimeReminderEnabled: false,
      wakeAlarmEnabled: false,
    },
  },
});

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
