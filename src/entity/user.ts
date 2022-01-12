import { Entity, Column, BaseEntity, ObjectIdColumn } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { ObjectId } from 'mongodb'


@ObjectType()
@Entity()
export class User extends BaseEntity {

  @Field(() => ID)
  @ObjectIdColumn()
  _id!: ObjectId

  @Field()
  @Column('text', { unique: true })
  email!: string

  @Column()
  password!: string

  @Column()
  confirmed!: boolean

}

