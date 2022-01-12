import 'reflect-metadata'
import Joi from 'joi'
import { Context } from 'vm'
import { MiddlewareInterface, NextFn, ResolverData } from 'type-graphql'
import { getMongoRepository, MongoRepository } from 'typeorm'
import { User } from '../entity/user'

const schema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } }),
  password: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
})

export class Validate implements MiddlewareInterface<Context> {
  private readonly userRepository: MongoRepository<User> = getMongoRepository(User)

  /**
   * Basic middleware
   * @param param :: { args }  
   * @param next :: next function
   */
  async use({ args }: ResolverData<Context>, next: NextFn) {
    const user = await this.userRepository.findOne({ email: args.email })

    /* Throw error if user is found */
    if (user)
      throw new Error('A user with that email already exists.')
    try {
      await schema.validateAsync({ email: args.email, password: args.password })

      return next();
    } catch (error) { return error }
  }
}