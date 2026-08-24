import { Injectable } from "../decorators/injectable";
import { CreateUserDto } from "../dto/create-user.dto";
import { NotFoundError } from "../types";
import { getRequestId } from "../context/request-context";

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
    if (id < 1) {
      throw new NotFoundError(`User ${id} not found`);
    }
    console.log(`requestId=${getRequestId()}`);
    return { id, email: "test@test.com", name: "Test" };
  }
}
