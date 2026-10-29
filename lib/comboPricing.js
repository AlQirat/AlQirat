export function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function getComboSelectionTotal(selections) {
  return selections.reduce((total, selection) => total + Math.max(0, Number(selection.quantity) || 0), 0);
}

export function calculateComboPricing(offer, selections) {
  const bundleQuantity = Math.max(1, Number(offer?.bundle_quantity) || 1);
  const comboPrice = Math.max(0, Number(offer?.combo_price) || 0);
  const eligibleProducts = new Map((offer?.products || []).map((product) => [String(product.product_id || product.id), product]));
  const normalized = selections
    .map((selection) => {
      const productId = String(selection.product_id || selection.id || "");
      const product = eligibleProducts.get(productId) || selection;
      const quantity = Math.max(0, Number(selection.quantity) || 0);
      return {
        ...product,
        ...selection,
        product_id: productId,
        unit_price: Number(product.unit_price ?? selection.unit_price ?? 0),
        quantity,
      };
    })
    .filter((selection) => selection.product_id && selection.quantity > 0)
    .sort((left, right) => left.product_id.localeCompare(right.product_id));

  const totalQuantity = getComboSelectionTotal(normalized);
  const bundleCount = Math.floor(totalQuantity / bundleQuantity);
  const bundleUnits = bundleCount * bundleQuantity;
  let cursor = 0;
  let regularTotal = 0;
  let extraTotal = 0;
  const lines = normalized.map((selection) => {
    const start = cursor;
    const end = cursor + selection.quantity;
    cursor = end;
    const extraQuantity = Math.max(0, end - bundleUnits) - Math.max(0, start - bundleUnits);
    const bundleUnitsInLine = selection.quantity - extraQuantity;
    const lineTotal = roundCurrency((bundleUnitsInLine * comboPrice) / bundleQuantity + extraQuantity * selection.unit_price);
    const regularLineTotal = roundCurrency(selection.quantity * selection.unit_price);
    regularTotal += regularLineTotal;
    extraTotal += extraQuantity * selection.unit_price;
    return {
      ...selection,
      bundle_quantity: bundleUnitsInLine,
      extra_quantity: extraQuantity,
      line_total: lineTotal,
      regular_line_total: regularLineTotal,
    };
  });

  const total = roundCurrency(bundleCount * comboPrice + extraTotal);
  const regularSubtotal = roundCurrency(regularTotal);
  return {
    totalQuantity,
    bundleCount,
    bundleUnits,
    extraQuantity: totalQuantity - bundleUnits,
    bundleTotal: roundCurrency(bundleCount * comboPrice),
    extraTotal: roundCurrency(extraTotal),
    total,
    regularSubtotal,
    discount: roundCurrency(Math.max(0, regularSubtotal - total)),
    lines,
  };
}

export function mergeComboSelections(currentSelections, nextSelections) {
  const quantities = new Map(currentSelections.map((selection) => [String(selection.product_id || selection.id), selection.quantity]));
  const products = new Map(currentSelections.map((selection) => [String(selection.product_id || selection.id), selection]));
  nextSelections.forEach((selection) => {
    const productId = String(selection.product_id || selection.id);
    quantities.set(productId, (quantities.get(productId) || 0) + (Number(selection.quantity) || 0));
    products.set(productId, selection);
  });
  return [...products.entries()]
    .map(([productId, product]) => ({ ...product, product_id: productId, quantity: quantities.get(productId) || 0 }))
    .filter((selection) => selection.quantity > 0);
}
