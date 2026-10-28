/**
 * Formats an amount in INR currency format.
 * Example: 4720 -> "₹4,720"
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formats integer paise into INR currency format.
 * 1 INR = 100 paise.
 * Example: 354000 -> "₹3,540", 50000 -> "₹500"
 */
export function formatPaise(paise = 0, currency = 'INR') {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0';
  }
  const inr = Number(paise) / 100;
  const hasDecimals = paise % 100 !== 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(inr);
}
