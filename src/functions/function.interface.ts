export interface FunctionMetadata {
    name: string;
    language: string;
    filePath: string;
    entryPoint: string;
    timeout?: number;
}

export interface FunctionRegistry {
    [key: string]: FunctionMetadata;
}
