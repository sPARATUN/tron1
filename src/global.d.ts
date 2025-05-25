// global.d.ts
export {};

declare global {
  interface Window {
    tronWeb: any; // Можно указать точный тип позже, но для начала можно `any`
    TronWeb: any;
  }
}
