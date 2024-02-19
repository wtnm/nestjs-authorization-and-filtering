import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';
import { Role } from '../role/role.entity';
import { Exclude } from 'class-transformer';
import { authHashPassword } from '../auth/helpers/auth.hash-password';

@Entity({ name: 'users' })
export class User extends Role {
  @IsEmail()
  @Column({ nullable: false, unique: true })
  email: string;

  @IsString()
  @Column({ name: 'password', nullable: false, default: '' })
  password: string;

  @IsOptional()
  @IsNumber()
  @Column({ nullable: false, default: 0 })
  @JoinColumn({ name: 'role' })
  @ManyToOne(() => Role)
  role?: number;

  @Exclude()
  @Column({ nullable: false, default: 0 })
  relevance?: number;

  @IsOptional()
  @IsBoolean()
  @Column({ name: 'is_super_user', nullable: false, default: false })
  isSuperUser?: boolean;

  @IsOptional()
  @IsString()
  @Column({ nullable: false, default: '' })
  image?: string;

  @IsOptional()
  @IsBoolean()
  @Column({ name: 'is_active', nullable: false, default: true })
  isActive?: boolean;

  @Exclude()
  created!: number;

  @Exclude()
  updated!: number;

  @Exclude()
  deletedAt?: number;

  @BeforeInsert()
  @BeforeUpdate()
  private async hashPassword() {
    if (this.password !== '') {
      this.password = await authHashPassword(this.password);
    } else {
      delete this.password;
    }
  }
}
