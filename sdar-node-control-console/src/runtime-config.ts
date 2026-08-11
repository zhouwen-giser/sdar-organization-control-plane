import type { RoleId } from './domain';

export type ConsoleGatewayMode = 'mock' | 'live';

export interface ConsoleRuntimeConfig {
  gatewayMode: ConsoleGatewayMode;
  activeDeploymentRole?: RoleId;
  securityClassification: string;
}

declare global {
  interface Window {
    __SDAR_CONSOLE_CONFIG__?: ConsoleRuntimeConfig;
  }
}

const MOCK_DEFAULT: ConsoleRuntimeConfig = Object.freeze({
  gatewayMode: 'mock',
  securityClassification: 'LOCAL_MOCK',
});

export function getConsoleRuntimeConfig(): ConsoleRuntimeConfig {
  const configured = window.__SDAR_CONSOLE_CONFIG__;
  if (!configured) return MOCK_DEFAULT;
  if (configured.gatewayMode === 'live' && !configured.activeDeploymentRole) {
    throw new Error('Live Console runtime config requires an active deployment role');
  }
  return Object.freeze({ ...configured });
}
