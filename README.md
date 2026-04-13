# Cron Describe

Cron expression → natural language description in **English and Japanese**.

Live demo: <https://sen.ltd/portfolio/cron-describe/>

## Features

- Paste any 5-field cron expression and get an instant plain-language description
- Dual language output (English + Japanese) simultaneously
- Supports `*`, `,`, `-`, `/`, `?` special characters
- Named shortcuts: `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`, `@reboot`
- Shows next 5 fire times
- Inline validation with clear error messages
- 16 example expressions — click any row to load it
- Dark / light theme, language toggle (JA / EN)
- Zero dependencies, no build step, vanilla JS ES modules

## Getting Started

```bash
git clone https://github.com/sen-ltd/cron-describe
cd cron-describe
npm run serve      # python3 -m http.server 8080
# open http://localhost:8080
```

## Tests

```bash
npm test
```

Runs with Node.js built-in test runner (`node:test`), no extra packages needed.

## Expression Format

Standard 5-field cron:

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Special characters:

| Character | Meaning |
|-----------|---------|
| `*`       | Any value |
| `?`       | Any value (alias for `*`) |
| `,`       | List separator: `1,3,5` |
| `-`       | Range: `1-5` |
| `/`       | Step: `*/15`, `0-23/6` |

## Related

- [Cron Builder](https://sen.ltd/portfolio/cron-builder/) — GUI to build cron expressions
- [Cron TZ Viewer](https://sen.ltd/portfolio/cron-tz-viewer/) — View next runs across timezones

## License

MIT © 2026 SEN LLC (SEN 合同会社)
