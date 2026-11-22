'use server';

import { revalidatePath } from 'next/cache';
import { OperatorService } from '@/services/operator.service';
import type { CreateOperatorInput } from '@/types/operator';

export async function getOperatorsAction() {
  return await OperatorService.getOperators();
}

export async function createOperatorAction(input: CreateOperatorInput) {
  const result = await OperatorService.createOperator(input);
  if (result.data) {
    revalidatePath('/inventory/operators');
  }
  return result;
}

export async function updateOperatorPinAction(operatorId: string, newPin: string) {
  const result = await OperatorService.updateOperatorPin(operatorId, newPin);
  if (result.success) {
    revalidatePath('/inventory/operators');
  }
  return result;
}

export async function toggleOperatorActiveAction(operatorId: string, isActive: boolean) {
  const result = await OperatorService.toggleOperatorActive(operatorId, isActive);
  if (result.success) {
    revalidatePath('/inventory/operators');
  }
  return result;
}

export async function deleteOperatorAction(operatorId: string) {
  const result = await OperatorService.deleteOperator(operatorId);
  if (result.success) {
    revalidatePath('/inventory/operators');
  }
  return result;
}
