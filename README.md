# mcp-censtatd-hk

Hong Kong Census and Statistics Department (C&SD) open-data MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Censtatd Hk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
