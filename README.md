# HBD Pati

Odliczanie do urodzin Pati (29.10) i codziennie nowa mini-gra. Jeden ekran, pixel art, działa na telefonie i kompie.

## Lokalnie

```bash
npm install
npm run dev
```

## Vercel

Import repo w Vercelu. Framework wykryje się sam (Vite), build `npm run build`, output `dist`.

## Zapis w chmurze i hasło

Postęp Pati (wygrane dni, skrzynki, ułożenie pokoju) zapisuje się w przeglądarce, a po
skonfigurowaniu także w chmurze, więc działa na każdym urządzeniu i w każdej przeglądarce.

1. Vercel → projekt → **Storage** → **Create Database** → **Upstash for Redis** (plan Free) → połącz z projektem.
   Vercel sam doda zmienne `KV_REST_API_URL` i `KV_REST_API_TOKEN`.
2. Vercel → projekt → **Settings → Environment Variables** → dodaj `PATI_PASSWORD` z hasłem dla Pati.
3. **Deployments** → przy ostatnim wdrożeniu `⋯` → **Redeploy**.

Od tego momentu przy pierwszym wejściu na nowym urządzeniu pojawia się ekran z hasłem (raz,
potem jest zapamiętane). Każde hasło to osobne konto: `PATI_PASSWORD` otwiera konto Pati,
a hasła pokazowe dla znajomych (domyślnie `wyklad1`, `wyklad2`, `chemia`; można je nadpisać
zmienną `FRIEND_PASSWORDS`, np. `wyklad1,wyklad2,chemia`) mają własne, osobne postępy.
W karcie postaci jest „wyloguj”, żeby na jednym telefonie przełączać konta. Wielkość liter, spacje i polskie znaki w haśle nie mają znaczenia.
Bez tej konfiguracji strona działa jak wcześniej, tylko lokalnie. Podpowiedź na ekranie
logowania: `passwordHint` w `src/config.js`.

Postęp z dwóch urządzeń się łączy: wygrane i skrzynki tylko przybywają, a pokój bierze
najnowsze ułożenie. Tryb `?dev=milk` ma osobny zapis i nigdy nie wysyła niczego do chmury.

## Gdzie co zmieniać

- `src/config.js`: imię, data, plan dni (gra, tytuł, cel, nagroda), przedmioty ze skrzynek.
- `src/games/`: każda gra to osobny plik `mountX(root, { day, pal, onExit, onWin, onScore })`.
- `src/room.js`: żywy pokój na ekranie menu (Pati oddycha i mruga, firanki falują od wiatru, świeczka się pali, miasto miga, licznik na dywanie).
- `CONFIG.room.slots` w `src/config.js`: miejsca w pokoju, w które Pati może wstawiać rzeczy (`wall`, `surface`, `bed`, `floor`, `garland`).
- `ITEMS` w `src/config.js`: rzeczy ze skrzynek. `kind: 'dekoracja'` trafia do pokoju; `fits` mówi, gdzie pasuje, `action` co robi po kliknięciu (`photo`, `plush`, `lamp`, `garland`), `photo` to ścieżka do prawdziwego zdjęcia, `img` to własna grafika zamiast zastępczego sprite'a.
- `reward.items` przy każdym dniu: co wypada ze skrzynki. `starterItems`: rzeczy, które Pati ma od początku.
- Ważne obrazki (`hires: true` + `photo`) wiszą w ramce w pełnej rozdzielczości, a po kliknięciu otwierają się z przybliżaniem. Zdjęcia leżą w `public/photos/`.
- Na oknach nic nie stoi ani nie wisi: miejsca są tylko na ścianie, szafce, łóżku, podłodze i pod sufitem.
- `src/rug.js`: dywan z licznikiem, rysowany oczko po oczku.
- `src/palette.js`: kolory interfejsu.
- `src/sprites.js`: pixelowe sprite'y jako mapy znaków.

## Grafiki

Źródła są w `art-src/`, gotowe pliki w `public/art/`. Skrypty (Python + Pillow + NumPy):

- `art-src/clean_room.py room-day1.webp public/art/room.webp`: usuwa zamazanie z szafki nocnej oraz półkę z roślinką z lewej ściany (miejsce na obrazki).
- `art-src/prep_gdzies.py`: prostuje zdjęcie rysunku „Gdzieś to widziałam? 100/10” (perspektywa) i usuwa przycisk z ekranu.
- `art-src/cut_pati.py pati-sheet.webp public/art`: wycina Pati z białego tła i robi klatkę mrugnięcia.
- `art-src/prep_rug_city.py`: zapisuje pozycje świateł miasta do `src/city.json`.
- `art-src/cut_curtains.py`: wycina zasłony (ręczny obrys), żeby mogły falować od wiatru.

## Tryb testowy

Otwórz stronę z `?dev=milk`. Na dole pojawi się czerwony pasek: `−`/`+` zmienia symulowany dzień, `wygraj` zalicza bieżący dzień (żeby przetestować skrzynkę), `reset` czyści postęp, `off` wyłącza tryb.
Tryb testowy ma własny zapis w przeglądarce i nie synchronizuje się z chmurą, więc testy nie psują niczego u Pati. Pierwsze wejście z `?dev=milk` przenosi dotychczasowy lokalny zapis tej przeglądarki do testowego.

## Zasady dni

- Dziś grywalna jest tylko dzisiejsza gra, ale bez limitu prób.
- Niewygrany wcześniejszy dzień można nadrobić. Wygrany wraca dopiero po finale.
- Po finale (albo po 29.10) wszystkie gry są otwarte.
- Wygrana daje skrzynkę (ubranie albo przedmiot), a dni 3–6 dodatkowo cyfrę tajnego kodu `29.10`.
