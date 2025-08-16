export type LineItem = {
  label: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  cost: number;
};

export type Estimate = {
  items: LineItem[];
  subtotal: number;
  markup: number;
  tax: number;
  total: number;
  assumptions: Record<string, any>;
};

export type BasePricing = {
  deliveryFee: number;
  tripFee: number;
  laborHourly: number; // $/hr per person
  crewSize: number;
  taxRate: number;     // 0.0825 = 8.25%
  markup: number;      // 0.18 = 18%
  waste: number;       // default 0.08 = 8%
};

export type LandscapingPricing = BasePricing & {
  mulchPerYd: number;
  sodPerSqFt: number;
  disposalPerYd: number;
  gravelDensityLbPerFt3: number;
  gravelPerTon: number;
  mowingPerKSqFt: number;  // baseline per 1,000 sq ft (for small lawns)
  mowingMin: number;       // minimum charge
};
