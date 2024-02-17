import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AuthAccessEntities } from '../auth/auth.dto';
import { IsJSON, IsNumber, IsOptional, IsString } from 'class-validator';

@Entity({ name: 'roles' })
export class Role {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column({ nullable: false, default: '' })
  name: string;

  @IsOptional()
  @IsJSON()
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  auth?: AuthAccessEntities;

  @CreateDateColumn({ type: 'timestamp' })
  created!: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated!: number;

  // Add this column to your entity!
  //this.yourRepository.find({ where: { deletedAt: Not(IsNull()) }, withDeleted: true });
  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: number;
}
