import { Controller } from "../decorators/controller";
import { Injectable } from "../decorators/injectable";
import { Get, Post } from "../decorators/methods";
import { Body, Param, Query } from "../decorators/params";
import { CreateUserDto } from "../dto/create-user.dto";
import { UsersService } from "../services/users";
import { ParseIntPipe } from "../pipes/parse-int.pipe";
import { UseGuards } from "../decorators/guards";
import { AuthGuard } from "../guards/auth.guard";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";

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

  @Get("me")
  @UseGuards(AuthGuard)
  me() {
    return { ok: true };
  }

  @Post()
  createUser(@Body(ZodValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }
}
