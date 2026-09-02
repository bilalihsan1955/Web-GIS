declare module 'shpjs' {
  function shp(
    buffer: string | ArrayBuffer | { [key: string]: any },
    whiteList?: string[]
  ): Promise<any>;

  namespace shp {
    function parseZip(
      buffer: ArrayBuffer,
      whiteList?: string[]
    ): Promise<any>;
    function parseShp(
      buffer: ArrayBuffer,
      prj?: string
    ): any;
  }

  export default shp;
}
