import { Injectable } from "../../decorators/injectable";
import { CreateUserDto } from "../../dto/create-user.dto";

@Injectable()
export class UsersRepository {
  createUser(user: CreateUserDto) {
    return { id: 1, email: user.email, name: user.name };
  }

  list(limit: number) {
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      email: `test${i + 1}@test.com`,
      name: `Test ${i + 1}`,
    }));
  }

  userById(id: number) {
    return { id, email: "test@test.com", name: "Test" };
  }
}
