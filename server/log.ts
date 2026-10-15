export function log(message: string, source = "express") {
  const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`${t} [${source}] ${message}`);
}
