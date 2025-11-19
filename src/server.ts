// src/server.ts

// 1. Carregar variáveis de ambiente imediatamente
import 'dotenv/config'

// 2. Importar o Fastify e ferramentas de Validação/Documentação
import fastify, { FastifyInstance } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'

// Importações para Autenticação
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { authRoutes } from './routes/auth'

// 3. Inicialização Global do Supabase
// Exportamos a instância para ser usada em outros arquivos de rota
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

// 4. Criação e Configuração da Instância do Fastify
const app = fastify({
  // logger: true // Opcional: descomente se quiser logs automáticos
}).withTypeProvider<ZodTypeProvider>()

// Configurar os compiladores DEPOIS da criação da instância (Corrige o erro de overload de tipagem)
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)


/**
 * 5. Função de Inicialização do Servidor
 * Esta função configura o app, mas SÓ chama app.listen() se não estiver em modo Serverless.
 * @param isServerless Se verdadeiro, não chama app.listen()
 * @returns A instância do Fastify (app)
 */
export async function startServer(isServerless = false): Promise<FastifyInstance> {
  const port = Number(process.env.PORT) || 3333
  const host = process.env.HOST || '0.0.0.0'

  try {
    // -----------------------------------------------------------------
    // A. CONFIGURAÇÃO DE PLUGINS (Middleware)
    // -----------------------------------------------------------------

    // 1. Configurar CORS
    await app.register(fastifyCors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    })

    // 2. Configurar JWT (Autenticação)
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

    // 3. Configurar Cookies
    await app.register(fastifyCookie)

    // 4. Configurar Swagger/OpenAPI
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'HellaShipping API',
          description: 'API for capturing and managing shipping requests.',
          version: '1.0.0',
        },
      },
      transform: jsonSchemaTransform,
    })

    // 5. Configurar Scalar (Interface visual para a documentação)
    // Usamos import dinâmico para evitar problemas de ESM/CJS na Vercel
    const scalarReference = await import('@scalar/fastify-api-reference')
    await app.register(scalarReference.default, {
      routePrefix: '/docs',
    })

    // -----------------------------------------------------------------
    // B. ROTAS
    // -----------------------------------------------------------------

    // Rotas de Autenticação (Login, Cadastro)
    await app.register(authRoutes)

    // Exemplo de rota de saúde (Health Check)
    app.get('/health', async (request, reply) => {
      return { status: 'ok', uptime: process.uptime() }
    })
    
    // -----------------------------------------------------------------
    // C. INICIAR O SERVIDOR (Apenas se não for Serverless)
    // -----------------------------------------------------------------

    if (!isServerless) {
      await app.listen({ port, host })

      // Logs de sucesso
      console.log(`\n🚀 HTTP Server Running on http://localhost:${port}`)
      console.log(`📘 Docs available at http://localhost:${port}/docs\n`)
    }

    return app

  } catch (error) {
    console.error('❌ Server startup failed:', error)
    if (!isServerless) {
      process.exit(1)
    }
    throw error; // Lança o erro para o Serverless capturar
  }
}

// 6. Execução em Ambiente Local
// Esta chamada é ignorada quando o arquivo é importado pelo Vercel
if (require.main === module) {
  startServer()
}