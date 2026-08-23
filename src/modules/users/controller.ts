import { Controller } from "../../decorators/controller";
import { Injectable } from "../../decorators/injectable";
import { Get, Post } from "../../decorators/methods";
import { Body, Param, Query } from "../../decorators/params";
import { CreateUserDto } from "../../dto/create-user.dto";
import { ParseIntPipe } from "../../pipes/parse-int.pipe";
import { ValidationPipe } from "../../pipes/validation.pipe";
import { UsersService } from "./servise";

@Injectable()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query("limit", ParseIntPipe) limit: number = 10) {
    return this.usersService.list(limit);
  }
  @Get("/:id")
  userById(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.userById(id);
  }

  @Post()
  createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }
}
