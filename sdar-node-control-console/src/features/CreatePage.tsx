import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert } from '../components/icons';
import type { RecordKind } from '../domain';
import { navigate } from '../routes';
import { getOperation, useConsole } from '../state/ConsoleState';
import { Button, Callout, Panel } from '../components/ui';
import { RESOURCE_CONFIG } from './resourceConfig';
import { requiredScope } from '../gateways/operationPolicy';

interface FieldSpec { key: string; label: string; placeholder: string; type?: 'text' | 'url' | 'number' | 'textarea' | 'select'; options?: string[]; secretRef?: boolean; }

const FIELDS: Partial<Record<RecordKind, FieldSpec[]>> = {
  configuration: [
    { key: 'configurationId', label: 'Configuration ID', placeholder: 'runtime-policy' },
    { key: 'name', label: '显示名称', placeholder: 'Runtime 执行策略' },
    { key: 'targetType', label: '目标类型', placeholder: 'runtime', type: 'select', options: ['node', 'runtime', 'task_policy', 'evidence_export'] },
    { key: 'targetId', label: '目标 ID', placeholder: 'runtime-primary' },
    { key: 'applyMode', label: '应用模式', placeholder: 'hot_reload', type: 'select', options: ['hot_reload', 'new_task_only', 'reconnect_required', 'restart_required', 'immutable'] },
    { key: 'content', label: '配置内容（JSON）', placeholder: '{\n  "maxConcurrentTasks": 4\n}', type: 'textarea' },
  ],
  llmProvider: [
    { key: 'providerId', label: 'Provider ID', placeholder: 'llm-provider-01' }, { key: 'name', label: '显示名称', placeholder: 'Production LLM' },
    { key: 'providerType', label: 'Provider 类型', placeholder: 'openai-compatible' }, { key: 'baseUrl', label: 'Base URL', placeholder: 'https://example.internal/v1', type: 'url' },
    { key: 'credentialRef', label: 'Credential Ref', placeholder: 'secret://llm/production', secretRef: true },
  ],
  modelRoute: [
    { key: 'routeId', label: 'Route ID', placeholder: 'route-planning' }, { key: 'name', label: '显示名称', placeholder: 'Planning Route' },
    { key: 'stage', label: '阶段', placeholder: 'planning', type: 'select', options: ['planning', 'execution', 'evaluation', 'fallback'] },
    { key: 'primary', label: '主模型引用', placeholder: 'llm-provider:model' }, { key: 'fallbacks', label: 'Fallback（逗号分隔）', placeholder: 'provider-a:model-x, provider-b:model-y' },
  ],
  smppSource: [
    { key: 'smppSourceId', label: 'Source ID', placeholder: 'smpp-production' }, { key: 'name', label: '名称', placeholder: 'Production SMPP Registry' },
    { key: 'registryEndpoint', label: 'Registry Endpoint', placeholder: 'https://smpp.example/api/registry', type: 'url' },
    { key: 'credentialRef', label: 'Credential Ref', placeholder: 'secret://smpp/production', secretRef: true },
    { key: 'syncMode', label: '同步模式', placeholder: 'scheduled', type: 'select', options: ['manual', 'scheduled'] },
  ],
  skill: [
    { key: 'id', label: 'Package Reference', placeholder: 'skill-package-route-plan-2.5.0.tgz' },
    { key: 'name', label: 'Skill 名称', placeholder: 'Route Planning Skill 2.5.0' },
    { key: 'checksum', label: 'Package SHA-256', placeholder: 'sha256:...' },
    { key: 'signatureRef', label: '签名引用', placeholder: 'signature://skills/route-plan/2.5.0' },
  ],
  capability: [
    { key: 'id', label: 'Capability ID', placeholder: 'cap-new-capability' }, { key: 'name', label: '名称', placeholder: 'New Capability' },
    { key: 'domain', label: '领域', placeholder: 'operations' }, { key: 'version', label: '版本', placeholder: '1', type: 'number' },
    { key: 'description', label: '能力描述', placeholder: '描述输入、输出、成功标准和边界', type: 'textarea' },
    { key: 'riskLevel', label: '风险等级', placeholder: 'medium', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  ],
  a2aExposure: [
    { key: 'id', label: 'Exposure ID', placeholder: 'exposure-capability' }, { key: 'name', label: 'AgentSkill 名称', placeholder: 'Capability Exposure' },
    { key: 'capabilityId', label: 'Capability ID', placeholder: 'cap-route-planning' }, { key: 'capabilityVersion', label: 'Capability 版本', placeholder: '1', type: 'number' },
    { key: 'agentSkillId', label: 'AgentSkill ID', placeholder: 'route_planning' }, { key: 'visibility', label: '可见性', placeholder: 'organization', type: 'select', options: ['organization', 'public'] },
  ],
};

export function CreatePage({ kind }: { kind: RecordKind }) {
  const config = RESOURCE_CONFIG[kind];
  const fields = FIELDS[kind] ?? [];
  const operation = getOperation(config.createOperationId!);
  const { execute, canInvoke } = useConsole();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, ''])));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ mode: string; operationId?: string }>();
  const [error, setError] = useState('');
  const allowed = canInvoke(operation);
  const invalidSecret = useMemo(() => fields.some((field) => field.secretRef && values[field.key] && !values[field.key].startsWith('secret://')), [fields, values]);
  const valid = fields.filter((field) => ['configurationId', 'providerId', 'routeId', 'smppSourceId', 'id', 'name'].includes(field.key)).some((field) => values[field.key].trim()) && reason.trim().length >= 5 && !invalidSecret;

  const submit = async () => {
    setSubmitting(true); setError('');
    const payload: Record<string, unknown> = { ...values };
    for (const field of fields.filter((item) => item.type === 'number')) payload[field.key] = Number(values[field.key]);
    if (typeof payload.fallbacks === 'string') payload.fallbacks = payload.fallbacks.split(',').map((item) => item.trim()).filter(Boolean);
    try {
      const result = await execute({ operation, target: { type: kind, id: String(payload.id ?? payload.configurationId ?? payload.providerId ?? payload.routeId ?? payload.smppSourceId ?? 'new-draft') }, reason, idempotencyKey: `console-${operation.operationId}-${Date.now()}`, payload });
      setReceipt({ mode: result.mode, operationId: result.operation?.operationId });
    } catch (caught) { setError(caught instanceof Error ? caught.message : '提交失败'); }
    finally { setSubmitting(false); }
  };

  if (receipt) return <div className="completion-card"><CheckCircle2 size={48} /><span className="eyebrow">{receipt.mode === 'operation' ? '202 Accepted' : '201 Created'}</span><h2>{config.singular}请求已提交</h2><p>{receipt.mode === 'operation' ? '后台已创建 Management Operation。请通过 Operation 页面跟踪执行，不将 Accepted 误判为完成。' : '草稿已同步创建，可返回列表继续验证和发布。'}</p><div>{receipt.operationId && <Button variant="primary" onClick={() => navigate(`/operations/${receipt.operationId}`)}>查看 Operation</Button>}<Button onClick={() => navigate(config.listPath)}>返回列表</Button></div></div>;

  return <div className="page-stack"><section className="page-intro"><div><Button variant="ghost" onClick={() => navigate(config.listPath)}><ArrowLeft size={15} />返回</Button><span className="eyebrow">{operation.method} {operation.path}</span><h2>{config.createOperationId === 'importSkillPackage' ? '导入 Skill Package' : `创建${config.singular}`}</h2><p>{config.description}</p></div></section>
    <Callout title="合同约束">{config.boundary}</Callout>
    {!allowed && <Callout title="当前角色不可执行" tone="danger">缺少 {requiredScope(operation)} Scope。可切换角色检查禁用态，但控制台不会绕过 RBAC。</Callout>}
    <div className="form-layout"><Panel title="草稿内容" subtitle="字段来自冻结领域对象，不包含页面专用 DTO。" className="span-2"><div className="form-grid">{fields.map((field) => <label className={`form-field ${field.type === 'textarea' ? 'full' : ''}`} key={field.key}><span>{field.label}{field.secretRef && <em> 仅 SecretRef</em>}</span>{field.type === 'textarea' ? <textarea value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} /> : field.type === 'select' ? <select value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}><option value="">请选择</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'} value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} />}{field.secretRef && values[field.key] && !values[field.key].startsWith('secret://') && <small className="field-error">必须使用 secret:// 引用，禁止明文 Secret。</small>}</label>)}</div></Panel>
      <Panel title="提交控制"><div className="submission-summary"><ShieldAlert size={28} /><p>Actor 与 Role 从可信身份解析；请求体不能伪造。提交时自动生成 Idempotency Key。</p></div><label className="form-field"><span>业务原因</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="说明创建原因、影响和后续验证计划" /></label>{error && <div className="inline-error">{error}</div>}<Button variant="primary" loading={submitting} disabled={!valid || !allowed} onClick={submit}>提交草稿</Button></Panel>
    </div>
  </div>;
}
