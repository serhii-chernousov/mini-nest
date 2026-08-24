import { Injectable } from "../decorators/injectable";
import { CreateUserDto } from "../dto/create-user.dto";
import { UsersRepository } from "../repositories/users";
import { getRequestId } from "../context/request-context";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  createUser(user: CreateUserDto) {
    return this.usersRepository.createUser(user);
  }

  list(limit: number) {
    return this.usersRepository.list(limit);
  }

  userById(id: number) {
    console.log(`requestId=${getRequestId()}`);
    return this.usersRepository.userById(id);
  }
}
