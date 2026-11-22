import React from 'react';
import type { Metadata } from 'next';
import { OperatorService } from '@/services/operator.service';
import { OperatorsManagementClient } from '@/components/features/inventory/OperatorsManagementClient';

export const metadata: Metadata = {
  title: 'CJ Operators | WMS',
  description: 'Manage CJ warehouse mobile operators, roles and PINs',
};

export const dynamic = 'force-dynamic';

export default async function OperatorsPage() {
  const { data: initialOperators } = await OperatorService.getOperators();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          CJ Operators (현장 작업자 관리)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          CJ-Inv 모바일 앱의 작업자 계정, 역할 및 4자리 PIN 번호를 통합 관리합니다.
        </p>
      </div>

      <OperatorsManagementClient initialOperators={initialOperators} />
    </div>
  );
}
