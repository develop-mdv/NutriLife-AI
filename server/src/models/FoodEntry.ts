import mongoose, { Schema, Document } from 'mongoose';

export interface IFoodEntry extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  imageUri?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  rating: number;
  recommendation: string;
  timestamp: number; // ms since epoch
}

const FoodEntrySchema = new Schema<IFoodEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  imageUri: String,
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  fat: { type: Number, required: true },
  carbs: { type: Number, required: true },
  rating: { type: Number, required: true },
  recommendation: { type: String, required: true },
  timestamp: { type: Number, required: true },
});

FoodEntrySchema.index({ userId: 1, timestamp: -1 });

export const FoodEntry = mongoose.model<IFoodEntry>('FoodEntry', FoodEntrySchema);
