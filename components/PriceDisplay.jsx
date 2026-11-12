export function formatPrice(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function PriceDisplay({ price, compareAtPrice, className = "", priceClassName = "text-xl font-bold text-ink", mrpClassName = "text-xs font-medium text-stone-400", showMrpAfterPrice = false }) {
  const sellingPrice = Number(price);
  const mrp = Number(compareAtPrice);
  const hasMrp = Number.isFinite(mrp) && Number.isFinite(sellingPrice) && mrp > sellingPrice;
  const mrpElement = hasMrp && <span className={`${mrpClassName} line-through`}>MRP ₹{formatPrice(mrp)}</span>;

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {!showMrpAfterPrice && mrpElement}
      <span className={priceClassName}>₹{formatPrice(sellingPrice)}</span>
      {showMrpAfterPrice && mrpElement}
    </div>
  );
}
