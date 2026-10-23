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
- `src/palette.js`: kolory. Dzień 1 jest monochromatyczny, a z każdym dniem dochodzą barwy.
- `src/sprites.js`: pixelowe sprite'y jako mapy znaków.

## Tryb testowy

Otwórz stronę z `?dev=milk`. Na dole pojawi się czerwony pasek: `−`/`+` zmienia symulowany dzień, `reset` czyści postęp, `off` wyłącza tryb.
Postęp zapisuje się w przeglądarce (localStorage), więc test u siebie nie psuje niczego u Pati.

## Zasady dni

- Dziś grywalna jest tylko dzisiejsza gra, ale bez limitu prób.
- Niewygrany wcześniejszy dzień można nadrobić. Wygrany wraca dopiero po finale.
- Po finale (albo po 29.10) wszystkie gry są otwarte.
- Wygrana daje skrzynkę (ubranie albo przedmiot), a dni 3–6 dodatkowo cyfrę tajnego kodu `29.10`.
