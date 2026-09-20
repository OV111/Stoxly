
export type CryptoAsset = {
  symbol: string;
  ticker: string;
  name: string;
  image?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
};

export type AnalysisResult = {
  analysisId: string;
  status: "completed" | "processing" | "error";
  data?: any; // Full analysis data from backend
  message?: string;
};
