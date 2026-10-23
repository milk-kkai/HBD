// Hasło porównujemy bez wielkości liter, spacji na brzegach i polskich znaków
// („Kotek ”, „kotek” i „kótek” to to samo). Używane w przeglądarce i w /api/save.
export function normPassword(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
