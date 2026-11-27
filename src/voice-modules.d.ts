declare module 'espeak-ng' {
  const factory: (options: {
    arguments: string[];
    stdin: () => number | null;
    print: (text: string) => void;
    printErr: (text: string) => void;
    locateFile: (path: string) => string;
  }) => Promise<unknown>;
  export default factory;
}
declare module '*?url' { const url: string; export default url; }
