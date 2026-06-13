import type { TestParameter } from "@/lib/types";

export function isSegmentParameter(parameter: Pick<TestParameter, "is_segment" | "name">): boolean {
  return parameter.is_segment === true;
}

export function countResultParameters(parameters: TestParameter[] | undefined): number {
  return (parameters ?? []).filter((parameter) => !isSegmentParameter(parameter)).length;
}

export function getResultParameters(parameters: TestParameter[] | undefined): TestParameter[] {
  return (parameters ?? []).filter((parameter) => !isSegmentParameter(parameter));
}

export function shouldShowSegmentHeader(
  parameters: TestParameter[],
  segmentIndex: number,
  hasValue: (parameter: TestParameter) => boolean
): boolean {
  const segment = parameters[segmentIndex];
  if (!segment || !isSegmentParameter(segment)) return false;

  for (let i = segmentIndex + 1; i < parameters.length; i++) {
    const parameter = parameters[i];
    if (isSegmentParameter(parameter)) break;
    if (hasValue(parameter)) return true;
  }

  return false;
}
