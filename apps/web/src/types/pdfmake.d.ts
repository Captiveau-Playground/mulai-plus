/* Minimal typings utk pdfmake (browser build dynamic import). */
declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    vfs: Record<string, string>;
    createPdf: (doc: any) => {
      download: (n?: string) => void;
      getBlob: (cb: (b: Blob) => void) => void;
      open: () => void;
    };
  };
  export default pdfMake;
}
declare module "pdfmake/build/vfs_fonts" {
  const fonts: { pdfMake: { vfs: Record<string, string> } };
  export default fonts;
}
