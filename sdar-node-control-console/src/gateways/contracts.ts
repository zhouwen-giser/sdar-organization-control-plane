import type { ContractOperation } from '../api/generated/contract';
import type {
  CommandInput, CommandReceipt, ConsoleRecord, GatewaySnapshot, QueryOptions, RecordKind, ScenarioId,
} from '../domain';

export interface NodeControlGateway {
  getSnapshot(): GatewaySnapshot;
  subscribe(listener: () => void): () => void;
  setScenario(scenario: ScenarioId): void;
  list(kind: RecordKind, options?: QueryOptions): Promise<ConsoleRecord[]>;
  get(kind: RecordKind, id: string): Promise<ConsoleRecord | undefined>;
  execute(input: CommandInput): Promise<CommandReceipt>;
  operationById(operationId: string): ContractOperation | undefined;
  reset(): void;
}
