import { LandscapingPricing } from "./types";

export const PRICING: LandscapingPricing = {
  // base business knobs
  deliveryFee: 75,
  tripFee: 35,
  laborHourly: 55,
  crewSize: 2,
  taxRate: 0.0825,
  markup: 0.18,
  waste: 0.08,

  // materials / service unit prices
  mulchPerYd: 45,
  sodPerSqFt: 0.65,
  disposalPerYd: 25,
  gravelDensityLbPerFt3: 100,
  gravelPerTon: 38,       // material $/ton (adjust)
  mowingPerKSqFt: 7.5,    // $ per 1,000 sq ft (small residential baseline)
  mowingMin: 45,          // minimum visit charge
};
