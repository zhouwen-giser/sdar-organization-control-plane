import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConsoleApp } from '../ConsoleApp';
import { ConsoleProvider } from '../state/ConsoleState';

function renderAt(path: string) {
  window.location.hash = path;
  return render(<ConsoleProvider><ConsoleApp /></ConsoleProvider>);
}

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('single-node console product experience', () => {
  it('renders the product overview and authority boundaries', () => {
    renderAt('/overview');
    expect(screen.getByRole('heading', { name: '节点总览' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'SDAR Tokyo Node 01' })).toBeInTheDocument();
    expect(screen.getByText('Runtime', { selector: 'strong' })).toBeInTheDocument();
  });

  it('opens a complete contract-backed list page', async () => {
    renderAt('/capabilities');
    expect(screen.getByRole('heading', { level: 1, name: 'Node Capability' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Route Planning Capability v1')).toBeInTheDocument());
    expect(screen.getByText(/Capability 是能力权威/)).toBeInTheDocument();
  });

  it('shows a domain not-found state for an unknown resource', async () => {
    renderAt('/llm/providers/missing-provider');
    await waitFor(() => expect(screen.getByText('LLM Provider 不存在')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /返回列表/ })).toBeInTheDocument();
  });

  it('enforces SecretRef validation in create flow', () => {
    renderAt('/llm/providers/new');
    const credential = screen.getByLabelText(/Credential Ref/);
    fireEvent.change(credential, { target: { value: 'plaintext-secret' } });
    expect(screen.getByText(/必须使用 secret:\/\//)).toBeInTheDocument();
  });

  it('renders all operations in the traceability page', () => {
    renderAt('/contract');
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('getNodeProfile')).toBeInTheDocument();
    expect(screen.getByText('publishConfigurationRevision')).toBeInTheDocument();
  });
});
