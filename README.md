# HBD Pati

Odliczanie do urodzin Pati (29.10) i codziennie nowa mini-gra. Jeden ekran, pixel art, działa na telefonie i kompie.

## Lokalnie

```bash
npm install
npm run dev
```

## Vercel

Import repo w Vercelu. Framework wykryje się sam (Vite), build `npm run build`, output `dist`.

## Gdzie co zmieniać

- `src/config.js`: imię, data, plan dni (gra, tytuł, cel, nagroda), przedmioty ze skrzynek.
- `src/games/`: każda gra to osobny plik `mountX(root, { day, pal, onExit, onWin, onScore })`.
- `src/room.js`: żywy pokój na ekranie menu (Pati oddycha i mruga, firanki falują od wiatru, świeczka się pali, miasto miga, licznik na dywanie).
- `CONFIG.room` w `src/config.js`: tło pokoju i od którego dnia pojawia się dana rzecz (`candle`, `pinkLight`, …).
- `src/palette.js`: kolory interfejsu.
- `src/sprites.js`: pixelowe sprite'y jako mapy znaków.

## Grafiki

Źródła są w `art-src/`, gotowe pliki w `public/art/`. Skrypty (Python + Pillow + NumPy):

- `art-src/clean_room.py room.webp public/art/room.webp`: usuwa zamazanie z szafki nocnej.
- `art-src/cut_pati.py pati-sheet.webp public/art`: wycina Pati z białego tła i robi klatkę mrugnięcia.
- `art-src/prep_rug_city.py`: wycina dywan, usuwa z niego cyfry i zapisuje pozycje świateł miasta do `src/city.json`.

## Tryb testowy

Otwórz stronę z `?dev=milk`. Na dole pojawi się czerwony pasek: `−`/`+` zmienia symulowany dzień, `reset` czyści postęp, `off` wyłącza tryb.
Postęp zapisuje się w przeglądarce (localStorage), więc test u siebie nie psuje niczego u Pati.

## Zasady dni

- Dziś grywalna jest tylko dzisiejsza gra, ale bez limitu prób.
- Niewygrany wcześniejszy dzień można nadrobić. Wygrany wraca dopiero po finale.
- Po finale (albo po 29.10) wszystkie gry są otwarte.
- Wygrana daje skrzynkę (ubranie albo przedmiot), a dni 3–6 dodatkowo cyfrę tajnego kodu `29.10`.
