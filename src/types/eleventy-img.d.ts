declare module '@11ty/eleventy-img' {
  type AnyRecord = Record<string, any>;

  function eleventyImage(source: string, options?: AnyRecord): Promise<any>;
  namespace eleventyImage {
    function generateHTML(metadata: any, attrs: AnyRecord, opts?: AnyRecord): string;
  }

  export = eleventyImage;
}
