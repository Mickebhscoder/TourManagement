import { revalidateTag } from "next/cache";
import MongoDBAdapter from "@/lib/db/MongoDBAdapter";
import { updateOneDoc } from "@/lib/db/updateOperationDB";
import { auth } from "@/lib/auth";
import routes from "@/data/routes.json";
import { getUserDetails } from "@/lib/controllers/user";

export async function GET(req) {
  try {
    const session = await auth();
    const isLoggedIn = !!session?.user;

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    // If not logged in, redirect to login page
    if (!isLoggedIn) {
      return new Response(
        JSON.stringify({
          redirectURL:
            req.nextUrl.origin +
            `${routes.login.path}?callbackPath=${encodeURIComponent(
              routes.profile.path
            )}`,
        }),
        {
          status: 307,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // If no token, redirect to profile
    const token = searchParams?.token;
    if (!token) {
      return new Response(
        JSON.stringify({
          redirectURL: req.nextUrl.origin + routes.profile.path,
        }),
        {
          status: 307,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get user details
    const user = await getUserDetails(session.user.id, 0);

    const inVerificationEmail = user.emails.filter(
      (e) => e.inVerification === true
    );

    let verifiedEmail = null;

    for (const email of inVerificationEmail) {
      // Use a normal async function, not a hook
      const isVerified = await MongoDBAdapter.verifyToken({
        identifier: email.email,
        token,
      });

      if (isVerified) {
        verifiedEmail = email.email;

        await updateOneDoc(
          "User",
          { _id: session.user.id, "emails.email": email.email },
          {
            $set: {
              "emails.$.emailVerifiedAt": new Date(),
              "emails.$.inVerification": false,
              ...(email.primary === true && { emailVerifiedAt: new Date() }),
            },
          }
        );

        revalidateTag("userDetails");
        break;
      }
    }

    if (verifiedEmail) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email verified",
          verifiedEmail,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email wasn't verified",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Confirm Email Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
