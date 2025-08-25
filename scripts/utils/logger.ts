export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = `[${prefix}]`;
  }

  info(message: string) {
    console.log(`${this.prefix} ℹ️  ${message}`);
  }

  success(message: string) {
    console.log(`${this.prefix} ✅ ${message}`);
  }

  warning(message: string) {
    console.log(`${this.prefix} ⚠️  ${message}`);
  }

  error(message: string) {
    console.log(`${this.prefix} ❌ ${message}`);
  }

  debug(message: string) {
    if (process.env.DEBUG) {
      console.log(`${this.prefix} 🔍 ${message}`);
    }
  }
}