// Wszystko, co zmieniasz ręcznie, jest w tym pliku.

export const CONFIG = {
  name: 'Pati',
  birthdayLabel: '29.10',
  birthdayDate: '2026-10-29',
  timeZone: 'Europe/Warsaw',

  // Kod do finału: cyfry zbierane z dni 3–6 składają się w "2910".
  // Każda skrzynka daje rzeczy z listy `items` (ubrania albo dekoracje do pokoju).
  days: [
    { n: 1, date: '2026-10-23', dow: 'PT', game: 'catch', title: 'Łap tort!', goal: 40, reward: { items: ['kokardka', 'ramka'] } },
    { n: 2, date: '2026-10-24', dow: 'SB', game: 'kabriolet', title: 'Różowe Porsche', goal: 30, reward: { items: ['okulary', 'switch'] } },
    { n: 3, date: '2026-10-25', dow: 'ND', game: 'karne', title: 'Kucykowe karne', reward: { digit: '2', items: ['buty', 'tomasz'] } },
    { n: 4, date: '2026-10-26', dow: 'PN', game: 'poker', title: 'Poker', reward: { digit: '9', items: ['zeton', 'lampka', 'plakat'] } },
    { n: 5, date: '2026-10-27', dow: 'WT', game: 'escape', title: 'Escape room', reward: { digit: '1', items: ['klucz', 'girlanda', 'polaroid'] } },
    { n: 6, date: '2026-10-28', dow: 'ŚR', game: 'pianino', title: 'Pianino', reward: { digit: '0', items: ['kurtka', 'kwiatek', 'zajaczek'] } },
    { n: 7, date: '2026-10-29', dow: 'CZ', game: 'finale', title: 'FINAŁ', reward: {} },
  ],

  // Pokój na ekranie menu. Miejsca (sloty) to jedyne punkty, w które Pati może coś wstawić.
  // x/y w pikselach grafiki pokoju (941×1672); y to podstawa rzeczy (albo środek dla 'wall'),
  // w to szerokość rzeczy w tym miejscu.
  room: {
    background: '/art/room.webp',
    slots: [
      // nic nie stoi ani nie wisi na oknie: obrazki tylko na ścianie obok zasłony
      { id: 'sciana', kind: 'wall', x: 144, y: 262, w: 56 },
      { id: 'sciana-2', kind: 'wall', x: 144, y: 452, w: 56 },
      { id: 'sufit', kind: 'garland', x: 482, y: 154, w: 660, sag: 14 },
      { id: 'szafka', kind: 'surface', x: 389, y: 706, w: 56 },
      { id: 'lozko-1', kind: 'bed', x: 228, y: 716, w: 74 },
      { id: 'lozko-2', kind: 'bed', x: 132, y: 726, w: 74 },
      { id: 'podloga-l', kind: 'floor', x: 384, y: 990, w: 96 },
      { id: 'podloga-p', kind: 'floor', x: 690, y: 992, w: 96 },
    ],
  },

  // Hasło ustawia się w Vercelu (zmienna PATI_PASSWORD), nie tutaj. Tu tylko opcjonalna
  // podpowiedź na ekranie logowania, np. 'imię naszego kota'.
  passwordHint: '',

  // rzeczy, które Pati ma od początku (bez wygrywania)
  starterItems: ['gdzies'],

  // ?dev=milk w adresie włącza panel testowy (zmiana dnia, reset postępu).
  devKey: 'milk',
};

// kind: 'ubranie' | 'przedmiot' trafia do karty postaci, 'dekoracja' do pokoju.
// fits: w jakie rodzaje miejsc da się wstawić dekorację; size: mnożnik szerokości miejsca.
// action: co się dzieje po kliknięciu w pokoju (photo = powiększenie, plush = ściśnięcie,
// lamp = zmiana światła z upgrade'ami, garland = tryb migania).
// photo: ścieżka do prawdziwego zdjęcia (np. '/photos/my.jpg'), wtedy ramka je pokaże.
// console = melodyjka i tekst.
export const ITEMS = {
  kokardka: { name: 'Różowa kokardka', kind: 'ubranie', desc: 'Pasuje do wszystkiego. Szczególnie do urodzin.' },
  okulary: { name: 'Okulary gwiazdy', kind: 'ubranie', desc: '???' },
  buty: { name: 'Złote buty', kind: 'ubranie', desc: '???' },
  zeton: { name: 'Szczęśliwy żeton', kind: 'przedmiot', desc: '???' },
  klucz: { name: 'Stary klucz', kind: 'przedmiot', desc: '???' },
  kurtka: { name: 'Kurtka gwiazdy', kind: 'ubranie', desc: '???' },

  gdzies: {
    name: 'Gdzieś to widziałam? 100/10',
    kind: 'dekoracja',
    fits: ['wall', 'surface', 'floor'],
    action: 'photo',
    photo: '/photos/gdzies-to-widzialam.webp',
    photoAspect: 1233 / 888,
    hires: true,
    desc: '',
  },
  ramka: { name: 'Ramka ze zdjęciem', kind: 'dekoracja', fits: ['wall', 'surface'], action: 'photo', desc: 'Zamienimy kiedyś na nasze zdjęcie, co ty na to?' },
  plakat: { name: 'Plakat', kind: 'dekoracja', fits: ['wall'], action: 'photo', desc: 'Plakat, który wisi u Ciebie' },
  polaroid: { name: 'Polaroid', kind: 'dekoracja', fits: ['wall', 'surface'], action: 'photo', desc: 'Zdjęcie z tamtego wieczoru' },
  zajaczek: { name: 'Pluszowy zajączek', kind: 'dekoracja', fits: ['bed', 'floor', 'surface'], size: { floor: 0.7 }, action: 'plush', desc: 'Miękki i trochę wścibski' },
  // img + pixel: własna grafika pixel art (rysowana bez wygładzania), aspect = wysokość / szerokość
  switch: {
    name: 'Nintendo Switch',
    kind: 'dekoracja',
    fits: ['surface', 'bed', 'floor'],
    size: { floor: 0.6, bed: 0.8 },
    img: '/art/items/switch.png',
    pixel: true,
    aspect: 14 / 28,
    action: 'console',
    desc: 'jeszcze jedna runda? 🎮',
  },
  tomasz: {
    name: 'Tomasz Wnęk',
    kind: 'dekoracja',
    fits: ['bed', 'floor', 'surface'],
    size: { floor: 0.8 },
    img: '/art/items/mis-tomasz.png',
    pixel: true,
    aspect: 34 / 32,
    action: 'plush',
    desc: 'Tomasz Wnęk 🧸',
  },
  lampka: { name: 'Lampka', kind: 'dekoracja', fits: ['surface', 'floor'], size: { floor: 0.6 }, action: 'lamp', desc: 'Kliknij, żeby zmienić światło. Każda wygrana = upgrade' },
  girlanda: { name: 'Lampki na karnisz', kind: 'dekoracja', fits: ['garland'], action: 'garland', desc: 'Kliknij, żeby zmienić miganie' },
  kwiatek: { name: 'Kwiatek', kind: 'dekoracja', fits: ['surface', 'floor'], size: { floor: 0.6 }, desc: 'Podlewać raz w tygodniu' },
};

export const LAMP_MODES = [
  { id: 'warm', name: 'ciepłe' },
  { id: 'pink', name: 'różowe' },
  { id: 'purple', name: 'fioletowe' },
  { id: 'disco', name: 'disco' },
];
