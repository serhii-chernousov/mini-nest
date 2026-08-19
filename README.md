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

## Як це працює

Контейнер не парсить конструктори сам. Коли в `tsconfig` увімкнено `experimentalDecorators` і `emitDecoratorMetadata`, компілятор для кожного класу з декоратором записує масив типів параметрів конструктора в метадані під ключем `design:paramtypes`. `reflect-metadata` тримає цю мапу в рантаймі; `Container.resolve()` читає її через `Reflect.getOwnMetadata` і резолвить кожен тип як залежність. Без `emitDecoratorMetadata` ключ порожній: контейнер бачить клас без параметрів і збирає його «всліпу», навіть якщо конструктор чекає `Logger` чи `Config`. Інтерфейси в рантаймі стираються до `Object`, примітиви стають `Number`/`String` — для них потрібен явний `@Inject(token)`, бо на `Object` декоратор не повісити.

## Docker

Образ збирає і проганяє тести, потім запускає скомпільований скрипт.

```bash
docker compose build
docker compose run --rm api
```
