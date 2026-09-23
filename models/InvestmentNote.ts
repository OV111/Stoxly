import mongoose, { Schema, type Model } from "mongoose";

export interface InvestmentNoteDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;

  type: "NOTE";

  assetId?: mongoose.Types.ObjectId;
  symbol?: string;

  title?: string;
  content: string;

  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const InvestmentNoteSchema =
  new Schema<InvestmentNoteDocument>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: ["NOTE"],
        default: "NOTE",
        immutable: true,
      },

      assetId: {
        type: Schema.Types.ObjectId,
        required: false,
      },

      symbol: {
        type: String,
        required: false,
        uppercase: true,
        trim: true,
      },

      title: {
        type: String,
        trim: true,
        maxlength: 120,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      tags: {
        type: [String],
        default: [],
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

InvestmentNoteSchema.index({
  userId: 1,
  createdAt: -1,
});

InvestmentNoteSchema.index({
  userId: 1,
  symbol: 1,
  createdAt: -1,
});

export const InvestmentNote: Model<InvestmentNoteDocument> =
  mongoose.models.InvestmentNote ||
  mongoose.model<InvestmentNoteDocument>(
    "InvestmentNote",
    InvestmentNoteSchema,
  );