import mongoose from 'mongoose';

const NewsItemSchema = new mongoose.Schema({
  assetId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  url: { type: String },
  source: { type: String },
  publishedAt: { type: Date, index: true },
  scrapedAt: { type: Date, default: Date.now },

  category: { type: String },
  sentimentScore: { type: Number },
  impactScore: { type: Number },
  summary: { type: String },
  isSignificant: { type: Boolean, default: false },

}, { timestamps: true });

NewsItemSchema.index({ assetId: 1, publishedAt: -1 });

export const NewsItemModel = mongoose.models.NewsItem || mongoose.model('NewsItem', NewsItemSchema);