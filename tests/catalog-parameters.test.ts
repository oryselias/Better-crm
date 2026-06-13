import {
  countResultParameters,
  isSegmentParameter,
  shouldShowSegmentHeader,
} from "../lib/reports/catalog-parameters";
import type { TestParameter } from "../lib/types";

const segment = (id: string, name: string): TestParameter => ({
  id,
  name,
  unit: "",
  normal_range: "",
  is_segment: true,
});

const param = (id: string, name: string): TestParameter => ({
  id,
  name,
  unit: "mg/dL",
  normal_range: "0-10",
});

function runTests() {
  console.log("Running catalog-parameters unit tests...\n");

  if (isSegmentParameter(segment("s1", "Chemical")) && !isSegmentParameter(param("p1", "pH"))) {
    console.log("✅ detects segment rows");
  } else {
    console.error("❌ segment detection failed");
    process.exit(1);
  }

  const parameters = [segment("s1", "Gross"), param("p1", "Color"), param("p2", "Appearance")];
  if (countResultParameters(parameters) === 2) {
    console.log("✅ counts only result parameters");
  } else {
    console.error("❌ result parameter count failed");
    process.exit(1);
  }

  const grouped = [segment("s1", "Chemical"), param("p1", "Protein"), param("p2", "Glucose")];
  if (
    shouldShowSegmentHeader(grouped, 0, (p) => p.id === "p2") &&
    !shouldShowSegmentHeader(grouped, 0, () => false)
  ) {
    console.log("✅ shows segment header only when child has a value");
  } else {
    console.error("❌ segment visibility failed");
    process.exit(1);
  }

  console.log("\n🎉 All catalog-parameters tests passed");
}

runTests();
