import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { JsonObject } from 'swagger-ui-express';

const openApiPath = path.join(process.cwd(), 'lib/openapi.yaml');
const swaggerSpec = yaml.load(
  fs.readFileSync(openApiPath, 'utf8')
) as JsonObject;

export default swaggerSpec;
