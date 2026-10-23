// Wszystko, co zmieniasz ręcznie, jest w tym pliku.

export const CONFIG = {
  name: 'Pati',
  birthdayLabel: '29.10',
  birthdayDate: '2026-10-29',
  timeZone: 'Europe/Warsaw',

  // Kod do finału: cyfry zbierane z dni 3–6 składają się w "2910".
  // Dni weekendowe (1–2) dają tylko skrzynkę.
  days: [
    { n: 1, date: '2026-10-23', dow: 'PT', game: 'catch', title: 'Łap tort!', goal: 20, reward: { item: 'kokardka' } },
    { n: 2, date: '2026-10-24', dow: 'SB', game: 'dreamhouse', title: 'Dreamhouse', reward: { item: 'okulary' } },
    { n: 3, date: '2026-10-25', dow: 'ND', game: 'karne', title: 'Kucykowe karne', reward: { digit: '2', item: 'buty' } },
    { n: 4, date: '2026-10-26', dow: 'PN', game: 'poker', title: 'Poker', reward: { digit: '9', item: 'zeton' } },
    { n: 5, date: '2026-10-27', dow: 'WT', game: 'escape', title: 'Escape room', reward: { digit: '1', item: 'klucz' } },
    { n: 6, date: '2026-10-28', dow: 'ŚR', game: 'pianino', title: 'Pianino', reward: { digit: '0', item: 'kurtka' } },
    { n: 7, date: '2026-10-29', dow: 'CZ', game: 'finale', title: 'FINAŁ', reward: {} },
  ],

  // Pokój na ekranie menu: od którego dnia pojawia się dana rzecz.
  room: {
    background: '/art/room.webp',
    layers: { candle: 1, pinkLight: 3 },
  },

  // ?dev=milk w adresie włącza panel testowy (zmiana dnia, reset postępu).
  devKey: 'milk',
};

export const ITEMS = {
  kokardka: { name: 'Różowa kokardka', kind: 'ubranie', desc: 'Pasuje do wszystkiego. Szczególnie do urodzin.' },
  okulary: { name: 'Okulary gwiazdy', kind: 'ubranie', desc: '???' },
  buty: { name: 'Złote buty', kind: 'ubranie', desc: '???' },
  zeton: { name: 'Szczęśliwy żeton', kind: 'przedmiot', desc: '???' },
  klucz: { name: 'Stary klucz', kind: 'przedmiot', desc: '???' },
  kurtka: { name: 'Kurtka gwiazdy', kind: 'ubranie', desc: '???' },
};
