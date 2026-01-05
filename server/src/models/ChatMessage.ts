import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'model';
  text: string;
  day: string; // YYYY-MM-DD, для группировки диалогов по дням
  createdAt: Date;
  expiresAt?: Date; // TTL для авто-очистки истории старше недели
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    day: { type: String, index: true },
    expiresAt: { type: Date, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Индексы: по пользователю и дате создания, плюс TTL по expiresAt
ChatMessageSchema.index({ userId: 1, day: 1, createdAt: 1 });
ChatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
