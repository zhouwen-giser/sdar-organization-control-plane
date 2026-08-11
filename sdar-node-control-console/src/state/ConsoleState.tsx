import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ContractOperation } from '../api/generated/contract';
import type { CommandInput, CommandReceipt, ConsoleErrorShape, ConsoleRecord, RecordKind, RoleId, ScenarioId } from '../domain';
import { nodeControlGateway } from '../gateways/factory';
import { canInvoke } from '../gateways/operationPolicy';
import { getConsoleRuntimeConfig, type ConsoleGatewayMode } from '../runtime-config';

interface QueryState<T> {
  data?: T;
  loading: boolean;
  refreshing: boolean;
  error?: ConsoleErrorShape;
}

interface ConsoleContextValue {
  role: RoleId;
  gatewayMode: ConsoleGatewayMode;
  securityClassification: string;
  scenario: ScenarioId;
  setRole(role: RoleId): void;
  setScenario(scenario: ScenarioId): void;
  execute(input: CommandInput): Promise<CommandReceipt>;
  canInvoke(operation: ContractOperation): boolean;
  toast?: { tone: 'success' | 'danger' | 'info'; message: string };
  clearToast(): void;
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const runtimeConfig = getConsoleRuntimeConfig();
  const [roleState, setRoleState] = useState<RoleId>(runtimeConfig.activeDeploymentRole ?? 'node_admin');
  const [scenario, updateScenario] = useState<ScenarioId>('healthy');
  const [toast, setToast] = useState<ConsoleContextValue['toast']>();

  const setRole = useCallback((next: RoleId) => {
    if (runtimeConfig.gatewayMode === 'mock') setRoleState(next);
  }, [runtimeConfig.gatewayMode]);

  const setScenario = useCallback((next: ScenarioId) => {
    updateScenario(next);
    nodeControlGateway.setScenario(next);
  }, []);

  const execute = useCallback(async (input: CommandInput) => {
    try {
      const receipt = await nodeControlGateway.execute(input);
      setToast({ tone: 'success', message: receipt.mode === 'operation' ? '命令已接受，已创建 Management Operation。' : '命令已同步完成。' });
      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message : '命令执行失败';
      setToast({ tone: 'danger', message });
      throw error;
    }
  }, []);

  const value = useMemo<ConsoleContextValue>(() => ({
    role: roleState, gatewayMode: runtimeConfig.gatewayMode, securityClassification: runtimeConfig.securityClassification,
    scenario, setRole, setScenario, execute,
    canInvoke: (operation) => canInvoke(roleState, operation),
    toast, clearToast: () => setToast(undefined),
  }), [roleState, runtimeConfig.gatewayMode, runtimeConfig.securityClassification, scenario, setRole, setScenario, execute, toast]);

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole() {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error('useConsole must be used within ConsoleProvider');
  return value;
}

export function useGatewaySnapshot() {
  return useSyncExternalStore(
    (listener) => nodeControlGateway.subscribe(listener),
    () => nodeControlGateway.getSnapshot(),
    () => nodeControlGateway.getSnapshot(),
  );
}

export function useCollection(kind: RecordKind, search = '', status = 'all'): QueryState<ConsoleRecord[]> & { refresh(): void } {
  const snapshot = useGatewaySnapshot();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QueryState<ConsoleRecord[]>>({ loading: true, refreshing: false });

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: previous.data == null, refreshing: previous.data != null, error: undefined }));
    nodeControlGateway.list(kind, { search, status }).then(
      (data) => active && setState({ data, loading: false, refreshing: false }),
      (error: ConsoleErrorShape) => active && setState((previous) => ({ ...previous, loading: false, refreshing: false, error })),
    );
    return () => { active = false; };
  }, [kind, search, status, nonce, snapshot.revision]);

  return { ...state, refresh: () => setNonce((value) => value + 1) };
}

export function useRecord(kind: RecordKind, id: string): QueryState<ConsoleRecord | undefined> & { refresh(): void } {
  const snapshot = useGatewaySnapshot();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QueryState<ConsoleRecord | undefined>>({ loading: true, refreshing: false });
  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: previous.data == null, refreshing: previous.data != null, error: undefined }));
    nodeControlGateway.get(kind, id).then(
      (data) => active && setState({ data, loading: false, refreshing: false }),
      (error: ConsoleErrorShape) => active && setState((previous) => ({ ...previous, loading: false, refreshing: false, error })),
    );
    return () => { active = false; };
  }, [kind, id, nonce, snapshot.revision]);
  return { ...state, refresh: () => setNonce((value) => value + 1) };
}

export function getOperation(operationId: string) {
  const operation = nodeControlGateway.operationById(operationId);
  if (!operation) throw new Error(`Unknown contract operation: ${operationId}`);
  return operation;
}
