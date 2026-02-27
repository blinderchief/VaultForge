declare module "snarkjs" {
  export namespace groth16 {
    function fullProve(
      input: Record<string, unknown>,
      wasmFile: string,
      zkeyFile: string
    ): Promise<{ proof: unknown; publicSignals: string[] }>;

    function verify(
      vkey: unknown,
      publicSignals: string[],
      proof: unknown
    ): Promise<boolean>;

    function exportSolidityCallData(
      proof: unknown,
      publicSignals: string[]
    ): Promise<string>;
  }

  export namespace r1cs {
    function info(r1csFile: string): Promise<unknown>;
  }

  export namespace zKey {
    function exportVerificationKey(zkeyFile: string): Promise<unknown>;
    function exportSolidityVerifier(
      zkeyFile: string,
      templates?: unknown
    ): Promise<string>;
  }
}
