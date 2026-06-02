interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Hong Kong Census and Statistics Department (C&SD) open-data MCP.
 *
 * Keyless statistics-office API at https://www.censtatd.gov.hk/api/get.php
 * (distinct from the Hong Kong Monetary Authority / HKMA central-bank pack).
 *
 * Verified behaviour (probed 2026-06):
 *  - get.php returns JSON `{header:{status,title,tablenote,source,count}, dataSet:[...]}`.
 *    Errors are NOT signalled by HTTP status (always 200) — they come back as
 *    `header.status.name === "Fail"` with a `message[]` array. We surface those.
 *  - `param` is normally an lz-string (compressToEncodedURIComponent) blob built by
 *    the C&SD website's JS. Its decoded form is table-specific dimension selection
 *    ({cv:{...internal codes...}, sv:{...}, l, tvrvs}) that cannot be reliably
 *    hand-built without the table's dimension metadata, so we DO NOT synthesise it.
 *  - Instead the reliable keyless path is `full_series=1` (the same URL data.gov.hk
 *    publishes), which returns the COMPLETE table with no param needed. That is the
 *    default here. A pre-built `param` blob (copy it from the C&SD web_table API
 *    Example box) may be passed through verbatim to fetch a filtered subset.
 *  - There is no native table-list endpoint on get.php; the catalog tool searches
 *    the data.gov.hk CKAN index of C&SD "tablechart" datasets and extracts table ids.
 */


const BASE = 'https://www.censtatd.gov.hk/api/get.php';
const CKAN = 'https://data.gov.hk/en-data/api/3/action/package_search';
const UA = 'pipeworx-mcp-censtatd-hk/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'censtatd_get_table',
    description:
      "Fetch a Hong Kong Census & Statistics Department statistical table as structured JSON " +
      "(time series of {period, sv (measure), svDesc, figure} plus any dimension code/Desc columns). " +
      "By default returns the FULL series (full_series=1) — reliable and keyless, no encoded param needed. " +
      "Use this for HK GDP, employment earnings, trade, prices, money/financial-market stats, etc. " +
      "Table ids look like '310-31001' (GDP) or '340-46001' (exchange rates); find ids with censtatd_search_tables. " +
      "Optionally pass `param` — the opaque lz-string blob copied from the table's API Example box on " +
      "censtatd.gov.hk — to fetch a filtered subset instead of the full series (we cannot generate this blob for you).",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Table id, e.g. '310-31001' (GDP), '340-46001' (exchange rates)." },
        lang: { type: 'string', enum: ['en', 'tc', 'sc'], description: 'Description language: en, tc (traditional), sc (simplified). Default en.' },
        param: {
          type: 'string',
          description:
            'OPTIONAL opaque lz-string param copied from the C&SD web_table "API Example" box. ' +
            'When provided, full_series is disabled and only the encoded selection is returned. ' +
            'Cannot be hand-constructed; omit it to get the full series.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'censtatd_table_info',
    description:
      "Get metadata for a Hong Kong C&SD statistical table without pulling the data: title, footnotes " +
      "(tablenote), and source/contact. Use to confirm a table id and read measurement caveats before " +
      "calling censtatd_get_table. Returns title, notes and source for the given id.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Table id, e.g. '310-31001'." },
        lang: { type: 'string', enum: ['en', 'tc', 'sc'], description: 'Language. Default en.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'censtatd_search_tables',
    description:
      "Search the Hong Kong C&SD table catalogue by keyword (e.g. 'exchange rates', 'unemployment', " +
      "'merchandise trade') and get back matching table ids + titles to use with censtatd_get_table. " +
      "Backed by the data.gov.hk open-data index of C&SD tablechart datasets. " +
      "Note: not every C&SD table is indexed there; ids can also be read off the table URL on " +
      "data.censtatd.gov.hk (the '310-31001' part of web_table.html?id=310-31001).",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Keywords, e.g. 'exchange rates' or 'employment earnings'." },
        limit: { type: 'number', description: 'Max results (default 20, max 50).' },
      },
      required: ['query'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'censtatd_get_table': {
      const id = reqStr(args, 'id', "'310-31001'");
      const lang = langOf(args);
      const param = typeof args.param === 'string' && args.param.trim() ? args.param.trim() : '';
      const qs = param
        ? `id=${encodeURIComponent(id)}&lang=${lang}&param=${param}`
        : `id=${encodeURIComponent(id)}&lang=${lang}&full_series=1`;
      const data = (await csdGet(`${BASE}?${qs}`)) as CsdResponse;
      assertOk(data, id);
      return {
        id,
        lang,
        title: data.header?.title ?? null,
        source: data.header?.source ?? null,
        tablenote: data.header?.tablenote ?? [],
        rowCount: data.header?.count?.noOfRecords ?? (Array.isArray(data.dataSet) ? data.dataSet.length : 0),
        dataSet: data.dataSet ?? [],
      };
    }
    case 'censtatd_table_info': {
      const id = reqStr(args, 'id', "'310-31001'");
      const lang = langOf(args);
      // 'N4XyA' is the lz-string (compressToEncodedURIComponent) encoding of "{}" — the
      // minimal valid param. An empty selection yields the header (title/tablenote/source)
      // with zero data rows, which is exactly the metadata we want here.
      const data = (await csdGet(`${BASE}?id=${encodeURIComponent(id)}&lang=${lang}&param=N4XyA`)) as CsdResponse;
      assertOk(data, id);
      return {
        id,
        lang,
        title: data.header?.title ?? null,
        source: data.header?.source ?? null,
        tablenote: data.header?.tablenote ?? [],
      };
    }
    case 'censtatd_search_tables': {
      const query = reqStr(args, 'query', "'exchange rates'");
      const limit = clampLimit(args.limit);
      // Restrict to C&SD tablechart datasets, AND the caller's keywords.
      const q = `${query} hk-censtatd-tablechart`;
      const url = `${CKAN}?q=${encodeURIComponent(q)}&rows=${limit}`;
      const data = (await csdGet(url)) as CkanResponse;
      const results = (data.result?.results ?? [])
        .map((p) => {
          const text = `${p.title ?? ''} ${p.name ?? ''}`;
          const m = text.match(/(\d{3}-\d{5})/);
          return m
            ? { id: m[1], title: (p.title ?? '').replace(/\s+/g, ' ').trim() }
            : null;
        })
        .filter((x): x is { id: string; title: string } => x !== null);
      return {
        query,
        totalMatches: data.result?.count ?? results.length,
        returned: results.length,
        note: 'Pass an id to censtatd_get_table. Tables without a parseable id are omitted.',
        tables: results,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface CsdResponse {
  header?: {
    status?: { name?: string; code?: number; message?: string[] };
    title?: string;
    tablenote?: string[];
    source?: string;
    count?: { noOfRecords?: number };
  };
  dataSet?: unknown[];
}

interface CkanResponse {
  result?: { count?: number; results?: Array<{ name?: string; title?: string }> };
}

async function csdGet(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`C&SD: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

// C&SD signals validation errors with HTTP 200 + header.status.name === "Fail".
function assertOk(data: CsdResponse, id: string): void {
  const status = data.header?.status;
  if (status && status.name && status.name !== 'Success') {
    const msg = (status.message ?? []).join('; ') || status.name;
    throw new Error(`C&SD: ${status.code ?? 1} ${`${msg} (id=${id})`.slice(0, 200)}`);
  }
}

function langOf(args: Record<string, unknown>): string {
  const l = typeof args.lang === 'string' ? args.lang.toLowerCase() : 'en';
  return l === 'tc' || l === 'sc' ? l : 'en';
}

function clampLimit(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 20;
  return Math.max(1, Math.min(50, n));
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v.trim();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
