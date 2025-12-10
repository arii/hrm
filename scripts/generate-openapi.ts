import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import * as fs from 'fs'
import * as path from 'path'
import { registry } from '../lib/openapi/registry'

// Import all schema files to trigger registration
import '../app/api/spotify/control/schema'
// Add future imports here:
// import '../app/api/timer/schema';

const generateOpenAPI = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'HRM App API',
      version: '1.0.0',
      description: 'API documentation for the Heart Rate Monitor & Gym Control System',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development' },
      { url: 'https://hrm.yourdomain.com', description: 'Production' },
    ],
  })

  const outputPath = path.join(process.cwd(), 'public', 'openapi.json')
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2))

  console.log(`✅ OpenAPI specification generated at: ${outputPath}`)
}

generateOpenAPI()
