// CSS module declarations — required for TypeScript to accept CSS imports
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
