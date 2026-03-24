const baseUrl = "http://localhost:3000";

function getCookie(headers: Headers): string {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No set-cookie header returned from dev-login");
  }

  return setCookie.split(";")[0];
}

async function getJson(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      cookie,
    },
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: response.status,
    body: json,
    raw: text,
  };
}

async function main() {
  const loginResponse = await fetch(`${baseUrl}/api/auth/dev-login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: "clay@skyveedrones.com" }),
  });

  const loginText = await loginResponse.text();
  const cookie = getCookie(loginResponse.headers);
  const me = await getJson("/api/trpc/auth.me", cookie);
  const adminPage = await fetch(`${baseUrl}/admin`, {
    headers: {
      cookie,
    },
  });
  const adminPageHtml = await adminPage.text();
  const stats = await getJson("/api/trpc/admin.getDashboardStats", cookie);
  const users = await getJson("/api/trpc/admin.getAllUsers", cookie);

  console.log(
    JSON.stringify(
      {
        loginStatus: loginResponse.status,
        loginBody: JSON.parse(loginText),
        meStatus: me.status,
        meRole: me.body?.result?.data?.json?.role ?? null,
        meOpenId: me.body?.result?.data?.json?.openId ?? null,
        adminPageStatus: adminPage.status,
        adminPageHasRoot: adminPageHtml.includes('<div id="root"></div>'),
        statsStatus: stats.status,
        statsBody: stats.body,
        usersStatus: users.status,
        usersCount: Array.isArray(users.body?.result?.data?.json)
          ? users.body.result.data.json.length
          : null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});