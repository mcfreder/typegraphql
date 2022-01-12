import 'reflect-metadata'
import { Arg, Mutation, Query, Resolver, Ctx, UseMiddleware } from 'type-graphql'
import { MongoRepository, getMongoRepository } from 'typeorm'
import { Context } from 'vm'
import { redis } from '../redis'

import bcrypt from 'bcrypt'
import { ObjectId } from 'mongodb'

import { User } from '../entity/user'
import { Validate } from '../middleware/validate'

@Resolver(User)
export class UserResolver {
  private readonly userRepository: MongoRepository<User> = getMongoRepository(User)

  /**
   * Create a new user
   * @param email :: user input email
   * @param password :: user input password
   */
  @Mutation(() => Boolean)
  @UseMiddleware(Validate)
  async create(
    @Arg('email') email: string, @Arg('password') password: string
  ): Promise<boolean> {
    /* Save new user to db */
    await this.userRepository.save({
      email,
      password: bcrypt.hashSync(password, 10),
      confirmed: false,
      watchlist: [],
      favorites: []
    })

    return true
  }

  /**
   * Confirm email
   * @param token :: confirmation token sent by email
   */
  @Mutation(() => Boolean)
  async confirm(@Arg('token') token: string): Promise<boolean> {
    const uid = await redis.get(token)

    if (!uid)
      return false

    await this.userRepository.updateOne({ _id: new ObjectId(uid) }, {
      $set: { confirmed: true }
    })

    await redis.del(token)

    return true
  }

  /**
   * Delete user
   * @param ctx :: context
   */
  @Mutation(() => Boolean)
  async delete(@Ctx() ctx: Context): Promise<boolean> {
    if (!ctx.req.session.uid)
      throw new Error('user not logged in')

    /* Delete user from db */
    await this.userRepository.deleteOne({ _id: new ObjectId(ctx.req.session.uid) })

    return new Promise((res, rej) =>
      /* Destroy session */
      ctx.req.session!.destroy((err: any) => {
        if (err)
          return rej(false)

        /* Clear cookie */
        ctx.res.clearCookie('qid')

        return res(true)
      })
    )
  }

  /**
   * Login user, set cookie
   * @param email :: user input email
   * @param password :: user input password
   */
  @Mutation(() => User)
  async login(
    @Arg('email') email: string, @Arg('password') password: string, @Ctx() ctx: Context
  ): Promise<User | void> {
    /* Find user by email */
    const user = await this.userRepository.findOne({ email }) as User

    /* Throw error if user not found or password incorrect */
    if (!user || !await bcrypt.compare(password, user.password))
      throw new Error('Email or password invalid.')

    /* Throw error if email is not confirmed */
    if (!user.confirmed)
      throw new Error('Please confirm your email.')

    /* Set user id to session */
    ctx.req.session!.uid = user._id

    return user
  }

  /**
   * Logout user
   * @param ctx :: context
   */
  @Mutation(() => Boolean)
  async logout(@Ctx() ctx: Context): Promise<boolean> {
    return new Promise((res, rej) =>
      /* Destroy session */
      ctx.req.session!.destroy((err: any) => {
        if (err)
          return rej(false)

        /* Clear cookie */
        ctx.res.clearCookie('qid')

        return res(true)
      })
    );
  }

  /**
   * Return user if auth 
   * @param ctx :: context
   */
  @Query(() => User)
  async user(@Ctx() ctx: Context): Promise<User | undefined> {
    /* Throw error if ID do not exist */
    if (!ctx.req.session.uid)
      throw new Error('unauthorized')

    /* Find user by ObjectId */
    return await this.userRepository
      .findOne({ _id: new ObjectId(ctx.req.session.uid) })
  }

}