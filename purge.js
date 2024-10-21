import { argv, env } from 'node:process';

const zone_id = "fc96ebad666f68db3db62edc4847577c"; // openbible.io
const invalidate_url =
  `https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache`;
const max_per_request = 30;
const to_invalidate = Deno.readTextFileSync(argv[2], "utf8")
  .split("\n")
  .filter(Boolean);
const token = env["CLOUDFLARE_PURGE_KEY"];

const batch = [];
while (to_invalidate.length > 0) {
  batch.push(to_invalidate.pop());
  if (batch.length == max_per_request) {
    const body = JSON.stringify({ files: batch });
    fetch(invalidate_url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body,
    })
      .then(async (res) => {
        if (!res.ok) {
          console.log(body);
          throw Error(await res.text());
        }
      });
    batch.length = 0;
  }
}
