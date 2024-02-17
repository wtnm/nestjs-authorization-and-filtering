import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const maybeUser = await this.userService.readOne({
      email__exact: email,
    });
    if (!maybeUser) throw new UnauthorizedException();
    const match = await bcrypt.compare(password, maybeUser.password);
    if (!match) throw new UnauthorizedException();

    const payload = { id: maybeUser.id, name: maybeUser.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
