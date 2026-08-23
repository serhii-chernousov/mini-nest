import { Injectable } from "../../decorators/injectable";
import { CreateUserDto } from "../../dto/create-user.dto";
import { UsersRepository } from "./repository";

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
    return this.usersRepository.userById(id);
  }
}
