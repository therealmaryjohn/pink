/* =====================================================================
   PINK WORLD — SIZE-LEVEL INVENTORY / STOCK TRACKING
   ===================================================================== */

function getSizeNames(product) {
  if (!product || !Array.isArray(product.sizes)) return [];
  return product.sizes.map(s => (typeof s === "object" && s !== null) ? s.size : s);
}

function getSizeStock(product, sizeName) {
  if (!product || !Array.isArray(product.sizes)) return 0;
  const found = product.sizes.find(s => ((typeof s === "object" && s !== null) ? s.size : s) === sizeName);
  if (!found) return 0;
  return (typeof found === "object" && found !== null) ? (Number(found.stock) || 0) : 999;
}

function getTotalStock(product) {
  if (!product || !Array.isArray(product.sizes)) return 0;
  return product.sizes.reduce((sum, s) => {
    const stock = (typeof s === "object" && s !== null) ? (Number(s.stock) || 0) : 999;
    return sum + stock;
  }, 0);
}

function isProductSoldOut(product) {
  return getTotalStock(product) <= 0;
}

function getFirstAvailableSize(product) {
  const names = getSizeNames(product);
  return names.find(n => getSizeStock(product, n) > 0) || names[0] || null;
}

async function decrementStockForOrder(items) {
  if (!(typeof productsSyncActive === "function" && productsSyncActive())) return;
  if (typeof fbDb === "undefined" || !fbDb) return;

  for (const item of items) {
    try {
      await fbDb.runTransaction(async (tx) => {
        const ref = fbDb.collection("products").doc(item.id);
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const data = snap.data();
        if (!Array.isArray(data.sizes)) return;
        const updatedSizes = data.sizes.map(s => {
          const sName = (typeof s === "object" && s !== null) ? s.size : s;
          if (sName === item.size) {
            const currentStock = (typeof s === "object" && s !== null) ? (Number(s.stock) || 0) : 0;
            return { size: sName, stock: Math.max(0, currentStock - item.qty) };
          }
          return s;
        });
        tx.update(ref, { sizes: updatedSizes });
      });
    } catch (e) {
      console.warn("Could not update stock for", item.id, item.size, e);
    }
  }
}
