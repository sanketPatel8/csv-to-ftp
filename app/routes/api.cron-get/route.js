// app/routes/api.cron-get.jsx
import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    // Call your existing POST route `/api/cron`
    const response = await fetch(`${new URL(request.url).origin}/api/cron`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    return json({
      from: "GET route",
      executed_post_route: true,
      result,
    });
  } catch (error) {
    return json(
      { error: "Failed to execute cron POST API", details: error.message },
      { status: 500 },
    );
  }
};
