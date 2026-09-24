import { describe, it, expect, vi, beforeEach } from "vitest";

// Every external dependency is mocked: the DB connection, quotes, the Alert and
// User models, and nodemailer. That leaves only the evaluator's state-machine
// logic under test — which alerts fire, re-arm, or stay put, and how many emails go out.

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

vi.mock("@/lib/mongoose", () => ({ connectDB: vi.fn() }));

const fetchQuotes = vi.fn();
vi.mock("@/lib/finnhub", () => ({ fetchQuotes: (s: string[]) => fetchQuotes(s) }));

const Alert = { find: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() };
vi.mock("@/models/Alert", () => ({ default: Alert }));

vi.mock("@/models/User", () => ({
  default: {
    findById: () => ({ select: async () => ({ name: "Test", email: "test@example.com" }) }),
  },
}));

const { evaluateAlerts } = await import("./alertEvaluator");

type FakeAlert = {
  _id: string;
  userId: string;
  symbol: string;
  condition: "ABOVE" | "BELOW";
  threshold: number;
  status: "ARMED" | "TRIGGERED";
  cooldownMinutes: number;
  lastTriggeredAt?: Date;
};

function alert(overrides: Partial<FakeAlert>): FakeAlert {
  return {
    _id: "a1",
    userId: "u1",
    symbol: "AAPL",
    condition: "ABOVE",
    threshold: 200,
    status: "ARMED",
    cooldownMinutes: 60,
    ...overrides,
  };
}

function givenAlerts(alerts: FakeAlert[], prices: Record<string, number>) {
  Alert.find.mockResolvedValue(alerts);
  fetchQuotes.mockResolvedValue(
    Object.entries(prices).map(([symbol, price]) => ({ symbol, price })),
  );
}

describe("evaluateAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.test"; // take the real-mail branch so sendMail is observable
  });

  it("triggers an ARMED alert once its condition is met and sends one email", async () => {
    const a = alert({});
    givenAlerts([a], { AAPL: 210 });
    Alert.findOneAndUpdate.mockResolvedValue({ ...a, status: "TRIGGERED" });

    const result = await evaluateAlerts();

    expect(result.triggered).toBe(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    // The status guard in the filter is what makes the transition a compare-and-swap.
    expect(Alert.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "a1", status: "ARMED" },
      expect.anything(),
      expect.anything(),
    );
    expect(Alert.updateOne).toHaveBeenCalledTimes(1); // lastNotifiedAt stamped
  });

  it("sends nothing when another worker already won the state transition", async () => {
    givenAlerts([alert({})], { AAPL: 210 });
    Alert.findOneAndUpdate.mockResolvedValue(null); // CAS filter missed

    const result = await evaluateAlerts();

    expect(result.triggered).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("leaves an ARMED alert alone while the condition is not met", async () => {
    givenAlerts([alert({ condition: "BELOW", threshold: 150 })], { AAPL: 160 });

    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(1);
    expect(Alert.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("re-arms a TRIGGERED alert once price is back and the cooldown has elapsed", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    givenAlerts([alert({ status: "TRIGGERED", lastTriggeredAt: twoHoursAgo })], { AAPL: 190 });
    Alert.findOneAndUpdate.mockResolvedValue({});

    const result = await evaluateAlerts();

    expect(result.rearmed).toBe(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("does not re-arm while the cooldown is still running", async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    givenAlerts([alert({ status: "TRIGGERED", lastTriggeredAt: fiveMinutesAgo })], { AAPL: 190 });

    const result = await evaluateAlerts();

    expect(result.rearmed).toBe(0);
    expect(Alert.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("isolates failures: one bad alert does not stop the rest of the sweep", async () => {
    const broken = alert({ _id: "broken" });
    const healthy = alert({ _id: "healthy", symbol: "MSFT" });
    givenAlerts([broken, healthy], { AAPL: 210, MSFT: 210 });
    Alert.findOneAndUpdate
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValueOnce({ ...healthy, status: "TRIGGERED" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await evaluateAlerts();

    expect(result.errored).toBe(1);
    expect(result.triggered).toBe(1);
  });

  it("skips alerts whose symbol has no quote", async () => {
    givenAlerts([alert({})], {});

    const result = await evaluateAlerts();

    expect(result.skippedNoQuote).toBe(1);
    expect(result.evaluated).toBe(0);
  });
});
