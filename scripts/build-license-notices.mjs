import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packages = [
  ["@supabase/auth-js", "LICENSE"],
  ["@supabase/functions-js", "LICENSE"],
  ["@supabase/phoenix", "LICENSE.md"],
  ["@supabase/postgrest-js", "LICENSE"],
  ["@supabase/realtime-js", "LICENSE"],
  ["@supabase/storage-js", "LICENSE"],
  ["@supabase/supabase-js", "LICENSE"],
  ["@tanstack/query-core", "LICENSE"],
  ["@tanstack/react-query", "LICENSE"],
  ["cookie", "LICENSE"],
  ["iceberg-js", "LICENSE"],
  ["lucide-react", "LICENSE"],
  ["react", "LICENSE"],
  ["react-dom", "LICENSE"],
  ["react-router", "LICENSE.md"],
  ["react-router-dom", "LICENSE.md"],
  ["set-cookie-parser", "LICENSE"],
];

const notices = await Promise.all(
  packages.map(async ([name, filename]) => {
    const license = await readFile(resolve("node_modules", name, filename), "utf8");
    return `${name}\n\n${license.trim()}`;
  }),
);
const credits = [
  "Lost & Found — Third-party software notices",
  "Inter font: SIL Open Font License 1.1\nhttps://github.com/rsms/inter/blob/master/LICENSE.txt",
  `Feather-derived Lucide icons — MIT License
Copyright (c) 2013–2022 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://lucide.dev/license`,
];
await writeFile(
  resolve("dist", "third-party-licenses.txt"),
  [...credits, ...notices].join("\n\n--------------------------------------------------\n\n") + "\n",
);
