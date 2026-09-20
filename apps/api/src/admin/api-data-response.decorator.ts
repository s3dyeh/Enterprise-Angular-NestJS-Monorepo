import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiDataResponse(
  model: Type<unknown>,
  options: { paged?: boolean; array?: boolean; status?: number } = {},
) {
  const item = { $ref: getSchemaPath(model) };
  const array = { type: 'array' as const, items: item };
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: options.status ?? 200,
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data: options.paged
            ? {
                type: 'object',
                required: ['list', 'count'],
                properties: {
                  list: array,
                  count: { type: 'integer', minimum: 0 },
                },
              }
            : options.array
              ? array
              : item,
        },
      },
    }),
  );
}
