import mongoose, { Schema, Document } from 'mongoose';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  height: number;
  weight: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  goal: 'lose_weight' | 'gain_muscle' | 'maintain';
  activityLevel: 'sedentary' | 'active' | 'athletic';
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  allergies?: string;
  preferences?: string;
  healthConditions?: string;
}

const ProfileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  name: String,
  height: Number,
  weight: Number,
  age: Number,
  gender: String,
  goal: String,
  activityLevel: String,
  dailyCalorieGoal: Number,
  dailyStepGoal: Number,
  allergies: String,
  preferences: String,
  healthConditions: String,
});

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
