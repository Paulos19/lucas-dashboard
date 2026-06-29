declare module 'xlsx-populate' {
    export interface Workbook {
        sheet(index: number | string): Sheet;
    }

    export interface Sheet {
        usedRange(): Range;
    }

    export interface Range {
        value(): any[][];
    }

    export interface XlsxPopulate {
        fromDataAsync(data: ArrayBuffer | Uint8Array | Buffer, options?: { password?: string }): Promise<Workbook>;
    }

    const XlsxPopulate: XlsxPopulate;
    export default XlsxPopulate;
}
