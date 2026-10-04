/* Daily challenges are keyed by the user's LOCAL date as "YYYY-MM-DD"
   (toISOString() would give the UTC date, which is wrong near midnight). */
export const dateKey = (d = new Date()) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
