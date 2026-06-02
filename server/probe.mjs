import YahooFinance from "yahoo-finance2";
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const period2 = new Date();
const period1 = new Date(period2);
period1.setDate(period1.getDate() - 540);
console.log("period1:", period1.toISOString(), "period2:", period2.toISOString());

const r = await yf.chart("AAPL", { period1, period2, interval: "1d" });
console.log("quote count:", r.quotes?.length);
console.log("first:", r.quotes?.[0]?.date, "last:", r.quotes?.[r.quotes.length-1]?.date);
