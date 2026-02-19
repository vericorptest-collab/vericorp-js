# @vericorp/company-verify

Official TypeScript/JavaScript SDK for the [VeriCorp Company Verify API](https://rapidapi.com/vericorptestcollab/api/vericorp) — European company verification and VAT validation.

## Install

```bash
npm install @vericorp/company-verify
```

## Quick Start

```typescript
import { VeriCorp } from "@vericorp/company-verify";

const client = new VeriCorp({ apiKey: "your-rapidapi-key" });

// Lookup a company
const company = await client.lookup("PT502011378");
console.log(company.name); // "UNIVERSIDADE DO MINHO"

// Validate a VAT number
const result = await client.validate("DK10150817");
console.log(result.vat_valid); // true

// Batch lookup (up to 10)
const batch = await client.batch(["PT502011378", "DK10150817"]);
console.log(batch.results);
```

## API

### `new VeriCorp(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | Your RapidAPI key |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `maxRetries` | `number` | `2` | Retries on 429/503 |

### Methods

- **`lookup(taxId, options?)`** — Full company data by tax ID
- **`lookupGB(companyNumber, options?)`** — UK company by company number
- **`validate(taxId)`** — Format + VIES VAT validation
- **`batch(taxIds)`** — Batch lookup (max 10)
- **`countries()`** — List supported countries
- **`health()`** — API health status

### Error Handling

```typescript
import { VeriCorp, NotFoundError, RateLimitError } from "@vericorp/company-verify";

try {
  await client.lookup("PT000000000");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Company not found");
  } else if (err instanceof RateLimitError) {
    console.log("Rate limited, try again later");
  }
}
```

## License

MIT
