import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthForgotPasswordDto } from './auth-forgot-password.dto';
export class AuthResendConfirmationDto extends AuthForgotPasswordDto {
  @IsOptional() @IsString() @MaxLength(8192) recaptchaToken?: string;
}
