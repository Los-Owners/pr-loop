/**
 * Ingesta de un PR público de GitHub: URL -> diff + archivos que toca.
 *
 * Mismo camino que el Paso 1b de la skill `repo-to-spec`: se leen los endpoints públicos
 * y se aterriza en el HEAD del PR (el código con los cambios ya aplicados), porque el
 * análisis tiene que describir el repo como quedaría al mergear, no la base sin ellos.
 *
 * Solo repos públicos (NO-4): endpoints anónimos, sin token, sin OAuth y sin app de
 * GitHub. Nada acá guarda credenciales ni las pide.
 */

export class GitHubError extends Error {}

export type PrRef = { owner: string; repo: string; number: number };

export type PrSource = {
  ref: PrRef;
  url: string;
  title: string;
  author: string;
  state: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  /** Cuántos commits detrás de la base quedó el HEAD explorado. Se reporta tal cual. */
  behindBy: number | null;
  diff: string;
  files: Record<string, string>;
  /** Archivos que el PR toca pero que no se mandaron al analizador, y por qué. */
  skipped: { path: string; reason: string }[];
  /** true si el PR toca más archivos de los que devuelve una página del endpoint. */
  morePages: boolean;
};

/** Cotas para que un PR grande no reviente el prompt ni el timeout. */
const LIMITS = {
  files: 24,
  bytesPerFile: 96_000,
  bytesTotal: 480_000,
  diffBytes: 300_000,
};

/** Ruido que no aporta al análisis y sí llena el contexto. */
const IGNORED = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lock(b)?|go\.sum|Cargo\.lock)$/i;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|svg|pdf|zip|gz|tgz|mp4|mov|woff2?|ttf|eot|wasm)$/i;
const MINIFIED = /\.min\.(js|css)$/i;

/**
 * Acepta lo que alguien pega de verdad: con esquema o sin él, con `/files` al final,
 * con querystring, o con barra sobrante.
 */
export function parsePrUrl(input: string): PrRef | null {
  const trimmed = input.trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
  const m = /^github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i.exec(trimmed);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, ""), number: Number(m[3]) };
}

function headers(accept: string): HeadersInit {
  return { accept, "user-agent": "pr-loop" };
}

async function gh(path: string, accept = "application/vnd.github+json") {
  const response = await fetch(`https://api.github.com${path}`, { headers: headers(accept) });
  if (response.status === 404) {
    throw new GitHubError("No encontramos ese PR. Solo funcionan repos públicos.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GitHubError("GitHub está limitando las peticiones. Prueba de nuevo en un momento.");
  }
  if (!response.ok) {
    throw new GitHubError(`GitHub respondió ${response.status} al pedir el PR.`);
  }
  return response;
}

type PullPayload = {
  title: string;
  state: string;
  user?: { login?: string };
  base: { ref: string; sha: string };
  head: { ref: string; sha: string };
};

type FilePayload = { filename: string; status: string; changes: number };

/** Trae el archivo completo en el HEAD del PR: es lo que hace que `evidence` cite una línea real. */
async function fetchFile(ref: PrRef, sha: string, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${sha}/${path}`;
  const response = await fetch(url, { headers: headers("text/plain") });
  if (!response.ok) return null;
  return response.text();
}

export async function fetchPr(input: string): Promise<PrSource> {
  const ref = parsePrUrl(input);
  if (!ref) {
    throw new GitHubError(
      "Pega la URL de un pull request, con la forma github.com/usuario/repo/pull/123.",
    );
  }
  const base = `/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`;

  const [pull, diff, fileList] = await Promise.all([
    gh(base).then((r) => r.json() as Promise<PullPayload>),
    gh(base, "application/vnd.github.diff").then((r) => r.text()),
    gh(`${base}/files?per_page=100`).then((r) => r.json() as Promise<FilePayload[]>),
  ]);

  // `behind_by` es la transparencia que compensa explorar el HEAD del PR y no la base actual.
  let behindBy: number | null = null;
  try {
    const compare = await gh(
      `/repos/${ref.owner}/${ref.repo}/compare/${pull.base.sha}...${pull.head.sha}`,
    );
    behindBy = (await compare.json()).behind_by ?? null;
  } catch {
    behindBy = null;
  }

  const skipped: { path: string; reason: string }[] = [];
  const files: Record<string, string> = {};
  let total = 0;

  const candidates = fileList
    .filter((f) => {
      if (f.status === "removed") {
        skipped.push({ path: f.filename, reason: "eliminado en el PR" });
        return false;
      }
      if (IGNORED.test(f.filename) || BINARY.test(f.filename) || MINIFIED.test(f.filename)) {
        skipped.push({ path: f.filename, reason: "no aporta al análisis" });
        return false;
      }
      return true;
    })
    // Los archivos con más cambios son los que el análisis necesita ver enteros.
    .sort((a, b) => b.changes - a.changes);

  for (const f of candidates) {
    if (Object.keys(files).length >= LIMITS.files || total >= LIMITS.bytesTotal) {
      skipped.push({ path: f.filename, reason: "el PR excede el tamaño que mandamos" });
      continue;
    }
    const body = await fetchFile(ref, pull.head.sha, f.filename);
    if (body === null) {
      skipped.push({ path: f.filename, reason: "no se pudo leer en el HEAD del PR" });
      continue;
    }
    if (body.length > LIMITS.bytesPerFile) {
      skipped.push({ path: f.filename, reason: "archivo demasiado grande" });
      continue;
    }
    files[f.filename] = body;
    total += body.length;
  }

  if (Object.keys(files).length === 0 && !diff.trim()) {
    throw new GitHubError("Ese PR no trae cambios que podamos analizar.");
  }

  return {
    ref,
    url: `https://github.com/${ref.owner}/${ref.repo}/pull/${ref.number}`,
    title: pull.title,
    author: pull.user?.login ?? "",
    state: pull.state,
    baseRef: pull.base.ref,
    headRef: pull.head.ref,
    headSha: pull.head.sha,
    behindBy,
    diff: diff.length > LIMITS.diffBytes ? diff.slice(0, LIMITS.diffBytes) : diff,
    files,
    skipped,
    morePages: fileList.length >= 100,
  };
}
