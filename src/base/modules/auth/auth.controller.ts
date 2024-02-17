import { Body, Controller, Post, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginRequestDto } from './auth.dto';
import { AuthOperation, PUBLIC_ROUTE } from './helpers/auth.decorators';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @AuthOperation(PUBLIC_ROUTE)
  async signIn(@Body() dto: AuthLoginRequestDto, @Res({ passthrough: true }) response: Response & { cookie: any }) {
    const { access_token } = await this.authService.login(dto.email, dto.password);
    response.cookie('access_token', 'Bearer ' + access_token, { httpOnly: true });
    response.cookie('isLoggedIn', true, { httpOnly: false });
  }
  @Post('user/logout')
  @HttpCode(HttpStatus.OK)
  @AuthOperation(PUBLIC_ROUTE)
  async signOut(@Res({ passthrough: true }) response: Response & { clearCookie: any }) {
    response.clearCookie('access_token', { httpOnly: true });
    response.clearCookie('isLoggedIn', { httpOnly: false });
  }
}
