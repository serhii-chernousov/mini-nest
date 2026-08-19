import "reflect-metadata";
import { Inject } from "./decorators/inject";
import { Injectable } from "./decorators/injectable";
import { Container } from "./container";
import { LOGGER_CONFIG } from "./tokens";

interface LoggerConfig {
  level: "info" | "error";
}

@Injectable()
class Config {
  readonly dbUrl = "postgres://localhost/demo";
}

@Injectable()
class Logger {
  constructor(
    private cfg: Config,
    @Inject(LOGGER_CONFIG) private config: LoggerConfig,
  ) {}
  log(m: string) {
    console.log(`  [log] ${this.config.level} ${m} (db=${this.cfg.dbUrl})`);
  }
}

@Injectable()
class UserRepo {
  constructor(private logger: Logger) {}
  find(id: string) {
    this.logger.log(`find ${id}`);
    return { id };
  }
}

@Injectable({ scope: "transient" })
class UserService {
  constructor(
    private repo: UserRepo,
    private logger: Logger,
  ) {}
  get(id: string) {
    return this.repo.find(id);
  }
}

const container = new Container();

container.bind(LOGGER_CONFIG, {
  level: "info",
});

const service = container.resolve(UserService);
console.log(service.get("42"));
console.log("transient:", container.resolve(UserService) !== service);
console.log("singleton:", container.get(Config) === container.get(Config));
