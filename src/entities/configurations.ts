import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'configurations' })
export class Configurations {
  @PrimaryGeneratedColumn('rowid')
  id?: string

  @Column({ nullable: false })
  type?: string

  @CreateDateColumn({ nullable: false })
  createdAt?: Date

  @UpdateDateColumn({ nullable: false })
  updatedAt?: Date

  @Column({ nullable: false })
  value?: string
}
