import type { NodeControlGateway } from './contracts';
import { HttpNodeControlGateway } from './HttpNodeControlGateway';
import { MockNodeControlGateway } from './MockNodeControlGateway';
import { getConsoleRuntimeConfig, type ConsoleRuntimeConfig } from '../runtime-config';

export interface GatewayFactories {
  http(): NodeControlGateway;
  mock(): NodeControlGateway;
}

const DEFAULT_FACTORIES: GatewayFactories = {
  http: () => new HttpNodeControlGateway(),
  mock: () => new MockNodeControlGateway(),
};

export function createNodeControlGateway(
  config: ConsoleRuntimeConfig = getConsoleRuntimeConfig(),
  factories: GatewayFactories = DEFAULT_FACTORIES,
) {
  return config.gatewayMode === 'live' ? factories.http() : factories.mock();
}

export const nodeControlGateway = createNodeControlGateway();
