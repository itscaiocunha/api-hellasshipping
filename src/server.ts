import 'dotenv/config'

import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import scalarReference from '@scalar/fastify-api-reference'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'

import { authRoutes } from './routes/auth'

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

const app = fastify({
  // serializerCompiler,
  // validatorCompiler,
}).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

async function startServer() {
  const port = Number(process.env.PORT) || 3333
  const host = process.env.HOST || '0.0.0.0'

  try {
    await app.register(fastifyCors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    })

    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'HellaShipping API',
          description: 'API da plataforma de gerenciamento de e-mails.',
          version: '1.0.0',
        },
      },
      transform: jsonSchemaTransform,
    })

    await app.register(authRoutes)

    await app.register(scalarReference, {
      routePrefix: '/docs',
    })

    await app.register(fastifyJwt, {
      secret: process.env.JWT_SECRET!,
      cookie: {
        cookieName: 'auth_token',
        signed: false,
      },
      sign: {
        expiresIn: '7d',
      },
    })

    await app.register(fastifyCookie)

    await app.listen({ port, host })

    console.log(`\n🚀 HTTP Server Running on http://localhost:${port}`)
    console.log(`📘 Docs available at http://localhost:${port}/docs\n`)

  } catch (error) {
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

startServer()