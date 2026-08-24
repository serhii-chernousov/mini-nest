# mini-nest

Мінімальний DI-контейнер з декораторами (`@Injectable`, `@Inject`) — ДЗ #6.

## Запуск

```bash
npm install
npm start
```

Прод-збірка:

```bash
npm run build
npm run start:prod
```

## Тести

```bash
npm test
```

Тести ганяються через Vitest + SWC (`emitDecoratorMetadata`). Перший тест перевіряє, що `design:paramtypes` на місці — якщо він червоний, ламатись буде конфіг трансформера, а не контейнер.

## Життєвий цикл запиту

```
Middleware → Guard → Interceptor (before) → Pipe → Handler
                                              ↓
                         Exception Filter ← Interceptor (after)
```

## Чому AsyncLocalStorage, а не глобальна змінна

Поки один запит чекає на `await`, event loop може взяти наступний. Якщо `requestId` лежить у глобальній змінній, другий запит її перезапише — і лог першого вже піде з чужим id. `AsyncLocalStorage.run(store, fn)` прив’язує сховище до асинхронного ланцюжка: кожен `await` і вкладений виклик сервісу чи репозиторію бачить **свій** store. Тому `getRequestId()` глибоко в стеку не потребує параметра, і паралельні запити не змішують контексти.

## Як це працює

Контейнер не парсить конструктори сам. Коли в `tsconfig` увімкнено `experimentalDecorators` і `emitDecoratorMetadata`, компілятор для кожного класу з декоратором записує масив типів параметрів конструктора в метадані під ключем `design:paramtypes`. `reflect-metadata` тримає цю мапу в рантаймі; `Container.resolve()` читає її через `Reflect.getOwnMetadata` і резолвить кожен тип як залежність. Без `emitDecoratorMetadata` ключ порожній: контейнер бачить клас без параметрів і збирає його «всліпу», навіть якщо конструктор чекає `Logger` чи `Config`. Інтерфейси в рантаймі стираються до `Object`, примітиви стають `Number`/`String` — для них потрібен явний `@Inject(token)`, бо на `Object` декоратор не повісити.

Параметр-декоратори (`@Body`, `@Param`, `@Query`) самі нічого не читають із запиту. Вони отримують `(target, propertyKey, parameterIndex)` і пишуть у метадані методу мапу `{ [index]: { type, name, pipes } }`. Диспетчер під час виклику читає цю мапу, збирає масив аргументів у потрібному порядку (`param` зі шляху, `query` з рядка запиту, `body` з JSON) і лише тоді викликає метод контролера. Ім'я аргумента в TypeScript стирається; ключ — індекс параметра, а `name` — рядок, який передали в декоратор (`@Param('id')`).

## Docker

Образ збирає і проганяє тести, потім запускає скомпільований скрипт.

```bash
docker compose build --no-cache
docker compose run --rm api npm test
docker compose run --rm api
```
