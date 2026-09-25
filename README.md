# mcp-censtatd-hk

Hong Kong Census and Statistics Department (C&SD) open-data MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `hongkong_unemployment_rate` | Hong Kong's headline labour-market figures in ONE call — unemployment rate (seasonally adjusted and unadjusted), underemployment rate, and labour-force participation rate, latest first. PREFER for "what is Hong Kong's unemployment rate", "HK jobless rate", "Hong Kong labour force participation", "is unemployment rising in Hong Kong". Source is the Census & Statistics Department (table 210-06101), keyless. Figures are 3-MONTH MOVING AVERAGES, which is how Hong Kong publishes them — a period of "2026-06" means April–June 2026, not the month of June. Use censtatd_get_table for anything deeper (by age, sex, industry). |
| `censtatd_get_table` | Fetch a Hong Kong Census & Statistics Department statistical table as structured JSON (time series of {period, sv (measure), svDesc, figure} plus any dimension code/Desc columns). By default returns the FULL series (full_series=1) — reliable and keyless, no encoded param needed. Use this for HK GDP, employment earnings, trade, prices, money/financial-market stats, etc. Table ids look like '310-31001' (GDP) or '340-46001' (exchange rates); find ids with censtatd_search_tables. Optionally pass `param` — the opaque lz-string blob copied from the table's API Example box on censtatd.gov.hk — to fetch a filtered subset instead of the full series (we cannot generate this blob for you). |
| `censtatd_table_info` | Get metadata for a Hong Kong C&SD statistical table without pulling the data: title, footnotes (tablenote), and source/contact. Use to confirm a table id and read measurement caveats before calling censtatd_get_table. Returns title, notes and source for the given id. |
| `censtatd_search_tables` | Search the Hong Kong C&SD table catalogue by keyword (e.g. 'exchange rates', 'unemployment', 'merchandise trade') and get back matching table ids + titles to use with censtatd_get_table. Backed by the data.gov.hk open-data index of C&SD tablechart datasets. Note: not every C&SD table is indexed there; ids can also be read off the table URL on data.censtatd.gov.hk (the '310-31001' part of web_table.html?id=310-31001). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "censtatd-hk": {
      "url": "https://gateway.pipeworx.io/censtatd-hk/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/censtatd-hk/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/hongkong_unemployment_rate \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/hongkong_unemployment_rate`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "censtatd-hk": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-censtatd-hk"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-censtatd-hk
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Censtatd Hk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
