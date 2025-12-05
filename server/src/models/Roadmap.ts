import mongoose, { Schema, Document } from 'mongoose';

export interface IRoadmapStep {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface IRoadmapTargets {
  dailyCalories: number;
  dailyWater: number;
  dailySteps: number;
  sleepHours: number;
}

export interface IRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  steps: IRoadmapStep[];
  targets: IRoadmapTargets;
  updatedAt: Date;
}

const RoadmapStepSchema = new Schema<IRoadmapStep>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
});

const RoadmapTargetsSchema = new Schema<IRoadmapTargets>({
  dailyCalories: { type: Number, required: true },
  dailyWater: { type: Number, required: true },
  dailySteps: { type: Number, required: true },
  sleepHours: { type: Number, required: true },
});

const RoadmapSchema = new Schema<IRoadmap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  steps: { type: [RoadmapStepSchema], default: [] },
  targets: { type: RoadmapTargetsSchema, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);
