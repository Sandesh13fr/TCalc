export interface SarifMultiformatMessageString {
  text: string;
  markdown?: string;
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  help?: SarifMultiformatMessageString;
  defaultConfiguration: {
    level: "error" | "warning" | "note";
  };
}

export interface SarifArtifactLocation {
  uri: string;
  uriBaseId?: string;
}

export interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region?: {
    startLine?: number;
    startColumn?: number;
  };
}

export interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

export interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: SarifLocation[];
  properties?: Record<string, unknown>;
}

export interface SarifDriver {
  name: string;
  version: string;
  informationUri: string;
  rules: SarifRule[];
}

export interface SarifRun {
  tool: {
    driver: SarifDriver;
  };
  results: SarifResult[];
}

export interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}
