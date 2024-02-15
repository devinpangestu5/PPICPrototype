import Decimal from "decimal.js";

export const roundClosestTen = (num) => {
  if (typeof num === Number) {
    num = new Decimal(num);
  }
  return num.div(new Decimal(10)).round().mul(new Decimal(10)).toNumber();
};
