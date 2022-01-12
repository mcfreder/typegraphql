import 'reflect-metadata'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import session from 'express-session'

import cookieParser from 'cookie-parser'

import { createConnection } from 'typeorm'
import { buildSchema } from 'type-graphql'

import connectRedis from 'connect-redis'
import { redis } from './redis'

import * as dotenv from 'dotenv'
import * as env from 'env-var'

class Server {
  /* Field */
  [x: string]: any

  /**
   * Constructor
   * @param port :: port to start server
   */
  constructor(port: number) {
    /* Init .env varibles */
    dotenv.config()

    /* Props */
    this.port = port
    this.app = express()
    this.RedisStore = connectRedis(session)
  }

  /**
   * Create Apollo Server
   */
  public async initialize(): Promise<void> {
    this.schema = await buildSchema({
      resolvers: [__dirname + '/resolvers/*.{ts,js}'],
    })

    this.server = new ApolloServer({
      schema: this.schema,
      context: ({ req, res }) => ({ req, res })
    })

    await createConnection()

    this.initializeMiddlewares()
    this.listen()
  }

  /**
   * Init middlewares.
   */
  private initializeMiddlewares(): void {
    this.app.use(
      session({
        store: new this.RedisStore({
          client: redis
        }),
        name: 'qid',
        secret: 'af1b85e5f085d5e',
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 1000 * 60 * 60 * 24 * 7 * 365
        }
      }),
      cookieParser()
    )
    this.server.applyMiddleware({ app: this.app })
  }

  /**
   * Server listen.
   */
  private listen(): void {
    this.app.listen(
      this.port, () =>
      console.log(
        `Server: ::${this.port}${this.server.graphqlPath}`
      )
    )
  }
}

const server = new Server(
  env.get('PORT').asIntPositive() || 4000
)

server.initialize()