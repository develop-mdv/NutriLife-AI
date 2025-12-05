import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyStats extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  calories: number;
  steps: number;
  water: number;
  sleepHours: number;
}

const DailyStatsSchema = new Schema<IDailyStats>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  date: { type: String, index: true },
  calories: { type: Number, default: 0 },
  steps: { type: Number, default: 0 },
  water: { type: Number, default: 0 },
  sleepHours: { type: Number, default: 0 },
});

DailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyStats = mongoose.model<IDailyStats>('DailyStats', DailyStatsSchema);
