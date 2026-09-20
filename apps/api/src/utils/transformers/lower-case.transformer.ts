import { TransformFnParams } from 'class-transformer';

export const lowerCaseTransformer = (params: TransformFnParams): unknown =>
  typeof params.value === 'string'
    ? params.value.trim().toLowerCase()
    : params.value;
