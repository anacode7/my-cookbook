// Best-effort unit conversion for Shopping List
// This is not scientifically perfect for every ingredient density, but works well for cooking.

export function convertToMetric(amount: number, unit: string): { amount: number; unit: string } {
    const u = unit.toLowerCase().trim().replace(/s$/, ""); // normalize (remove plural s)

    // Volume Conversions (fl oz, cups, spoons -> ml)
    if (u === "fl oz" || u === "floz") return { amount: amount * 29.57, unit: "ml" };
    if (u === "cup") return { amount: amount * 236.59, unit: "ml" };
    if (u === "pint" || u === "pt") return { amount: amount * 473.18, unit: "ml" };
    if (u === "quart" || u === "qt") return { amount: amount * 946.35, unit: "ml" };
    if (u === "gallon" || u === "gal") return { amount: amount * 3785.41, unit: "ml" };
    
    if (u === "tbsp" || u === "tablespoon") return { amount: amount * 15, unit: "ml" };
    if (u === "tsp" || u === "teaspoon") return { amount: amount * 5, unit: "ml" };

    // Weight Conversions (oz, lb -> g)
    if (u === "oz" || u === "ounce") return { amount: amount * 28.35, unit: "g" };
    if (u === "lb" || u === "pound") return { amount: amount * 453.59, unit: "g" };

    // Already Metric?
    if (u === "kg") return { amount: amount * 1000, unit: "g" };
    if (u === "l" || u === "liter") return { amount: amount * 1000, unit: "ml" };

    // Unknown or count (e.g. "whole", "pinch")
    return { amount, unit: unit };
}

export function formatMetricAmount(amount: number, unit: string): string {
    if (unit === "g" && amount >= 1000) {
        return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
    }
    if (unit === "ml" && amount >= 1000) {
        return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} L`;
    }
    // Round to reasonable decimals
    return `${parseFloat(amount.toFixed(1))} ${unit}`;
}
