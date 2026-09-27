// Imported first by the CLI so env vars exist before lib modules read them.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file is optional
  }
}
